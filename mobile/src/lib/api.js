import { supabase } from './supabase';

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

  // Save a fully-processed session (transcript + extracted medical data)
  saveSession: async ({
    rawTranscript,
    language       = 'hi-IN',
    detectedLang   = null,
    durationSecs   = null,
    extractedData  = null,
    patientName    = null,
    patientId      = null,
  }) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        raw_transcript:    rawTranscript,
        language,
        detected_language: detectedLang || language,
        duration_seconds:  durationSecs ? Math.round(durationSecs) : null,
        extracted_data:    extractedData,
        patient_name:      patientName || extractedData?.patient_name || null,
        patient_id:        patientId,
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
};
