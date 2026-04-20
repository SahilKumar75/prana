import { supabase } from './supabase';

// Maps profile UUIDs → patients table PAT-XXXX-XXXX IDs
const PATIENT_DB_IDS = {
  '00000000-0000-0000-0000-000000000003': 'PAT-PRIY-3210',
  '00000000-0000-0000-0000-000000000004': 'PAT-RAHU-0004',
};

const enrichPatient = (profile) =>
  profile ? { ...profile, patientDbId: PATIENT_DB_IDS[profile.id] || null } : null;

// ── Health check ────────────────────────────────────────────────────────────
export async function checkHealth() {
  const { error } = await supabase.from('sessions').select('id').limit(1);
  if (error) throw new Error(error.message);
  return true;
}

// ── Sessions API ────────────────────────────────────────────────────────────
export const api = {

  getSessions: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  getStats: async () => {
    const { data, error } = await supabase.from('sessions').select('id, status');
    if (error) throw new Error(error.message);
    return {
      total:     data.length,
      processed: data.filter((s) => s.status === 'processed').length,
      pending:   data.filter((s) => s.status === 'pending').length,
      error:     data.filter((s) => s.status === 'error').length,
    };
  },

  // Save session with optional doctor/request context
  saveSession: async ({
    rawTranscript,
    correctedTranscript = null,
    language       = 'hi-IN',
    detectedLang   = null,
    durationSecs   = null,
    extractedData  = null,
    patientName    = null,
    patientId      = null,
    doctorId       = null,
    requestId      = null,
    caseId         = null,
  }) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        raw_transcript:       rawTranscript,
        corrected_transcript: correctedTranscript,
        language,
        detected_language: detectedLang || language,
        duration_seconds:  durationSecs ? Math.round(durationSecs) : null,
        extracted_data:    extractedData,
        patient_name:      patientName || extractedData?.patient_name || null,
        patient_id:        patientId,
        doctor_id:         doctorId,
        request_id:        requestId,
        case_id:           caseId,
        status:            extractedData ? 'processed' : 'pending',
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Legacy — kept for compatibility
  createSession: async (rawTranscript, language = 'hi-IN') => {
    return api.saveSession({ rawTranscript, language });
  },

  // ── Profiles ────────────────────────────────────────────────────────────────
  getDoctors: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .neq('id', '00000000-0000-0000-0000-000000000002') // exclude demo seed doctor
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  setAvailable: async (doctorId, available) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_available: available })
      .eq('id', doctorId);
    if (error) throw new Error(error.message);
  },

  getProfile: async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ── Session requests ─────────────────────────────────────────────────────────
  createRequest: async ({ patientId, doctorId }) => {
    // Prevent duplicate pending requests to the same doctor
    const { data: existing } = await supabase
      .from('session_requests')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await supabase
      .from('session_requests')
      .insert([{ patient_id: patientId, doctor_id: doctorId, status: 'pending' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Pending requests waiting for a doctor to accept
  getPendingRequests: async (doctorId) => {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data || [];
    // Enrich with patient profiles
    const patientIds = [...new Set(requests.map((r) => r.patient_id))];
    if (patientIds.length === 0) return [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', patientIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    return requests.map((r) => ({ ...r, patient: enrichPatient(profileMap[r.patient_id]) }));
  },

  // All requests for a doctor (pending first, then rest by recency)
  getAllRequests: async (doctorId) => {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data || [];
    if (requests.length === 0) return [];
    const patientIds = [...new Set(requests.map((r) => r.patient_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', patientIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const enriched = requests.map((r) => ({ ...r, patient: enrichPatient(profileMap[r.patient_id]) }));
    // pending first, then rest sorted by created_at desc
    return [
      ...enriched.filter((r) => r.status === 'pending'),
      ...enriched.filter((r) => r.status !== 'pending'),
    ];
  },

  // Accepted patients waiting for a doctor to start session
  getAcceptedPatients: async (doctorId) => {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data || [];
    if (requests.length === 0) return [];

    const patientIds = [...new Set(requests.map((r) => r.patient_id))];
    const requestIds  = requests.map((r) => r.id);

    const [profilesRes, sessionsByRequestId, sessionsByDoctorRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', patientIds),
      // Check 1: session explicitly linked by request_id
      supabase
        .from('sessions')
        .select('request_id')
        .eq('doctor_id', doctorId)
        .in('request_id', requestIds),
      // Check 2: ALL sessions by this doctor — we'll cross-ref by patient_name
      // because sessions.patient_id stores patientDbId ('PAT-PRIY-3210'),
      // not the profile UUID stored in session_requests.patient_id
      supabase
        .from('sessions')
        .select('patient_name')
        .eq('doctor_id', doctorId)
        .not('patient_name', 'is', null),
    ]);

    const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.id, p]));
    const completedByRequestId = new Set(
      (sessionsByRequestId.data || []).map((s) => s.request_id)
    );
    // Build a set of lower-cased patient names that already have sessions with this doctor
    const sessionPatientNames = new Set(
      (sessionsByDoctorRes.data || []).map((s) => s.patient_name?.toLowerCase()).filter(Boolean)
    );

    const isStale = (r) => {
      if (completedByRequestId.has(r.id)) return true;
      const profileName = profileMap[r.patient_id]?.name?.toLowerCase();
      return profileName ? sessionPatientNames.has(profileName) : false;
    };

    // Silently fix stale rows in the background
    const stale = requests.filter(isStale);
    if (stale.length > 0) {
      supabase
        .from('session_requests')
        .update({ status: 'completed' })
        .in('id', stale.map((r) => r.id))
        .then(() => {})
        .catch(() => {});
    }

    return requests
      .filter((r) => !isStale(r))
      .map((r) => ({ ...r, patient: enrichPatient(profileMap[r.patient_id]) }));
  },

  acceptRequest: async (requestId) => {
    const { data, error } = await supabase
      .from('session_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  declineRequest: async (requestId) => {
    const { error } = await supabase
      .from('session_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    if (error) throw new Error(error.message);
  },

  completeRequest: async (requestId) => {
    const { error } = await supabase
      .from('session_requests')
      .update({ status: 'completed' })
      .eq('id', requestId);
    if (error) throw new Error(error.message);
  },

  // Patient's sent requests with doctor info
  getPatientRequests: async (patientId) => {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data || [];
    const doctorIds = [...new Set(requests.map((r) => r.doctor_id))];
    if (doctorIds.length === 0) return [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', doctorIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    return requests.map((r) => ({ ...r, doctor: profileMap[r.doctor_id] || null }));
  },

  // Sessions belonging to a specific patient
  getPatientSessions: async (patientId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Doctor's sessions
  getDoctorSessions: async (doctorId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  // ── Cases ──────────────────────────────────────────────────────────────────

  // Format: PAT-[first4ofName]-[last4ofPhone]
  generatePatientId: (name, phone) => {
    const nameChunk  = (name  || 'UNKN').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4).padEnd(4, 'X');
    const phoneChunk = (phone || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
    return `PAT-${nameChunk}-${phoneChunk}`;
  },

  getOrCreatePatient: async ({ patientDbId, name, age, phone }) => {
    if (patientDbId) {
      const { data } = await supabase.from('patients').select('*').eq('id', patientDbId).maybeSingle();
      if (data) return data;
    }
    const id = api.generatePatientId(name || 'UNKN', phone);
    const { data, error } = await supabase
      .from('patients').insert([{ id, name, age }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  getCasesForPatient: async (patientId) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*, sessions(id, created_at, extracted_data)')
      .eq('patient_id', patientId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  createCase: async ({ patientId, doctorId, caseType }) => {
    // Count ALL cases for this patient (including closed) for a monotonic ref number
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId);
    // patientId is like 'PAT-PRIY-3210' → prefix = 'PAT-PRIY'
    const parts  = patientId.split('-');
    const prefix = parts.slice(0, 2).join('-');
    const caseRef = `${prefix}-${String((count || 0) + 1).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('cases')
      .insert([{ patient_id: patientId, doctor_id: doctorId, case_type: caseType, case_ref: caseRef }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  getSessionsForCase: async (caseId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  closeCase: async (caseId) => {
    const { error } = await supabase
      .from('cases')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', caseId);
    if (error) throw new Error(error.message);
  },

  updateSession: async (sessionId, fields) => {
    if (!sessionId) return;
    const { error } = await supabase
      .from('sessions')
      .update(fields)
      .eq('id', sessionId);
    if (error) throw new Error(error.message);
  },
};
