import { supabase } from './supabase';

// ── Health check — ping Supabase with a lightweight query ──────────────────
export async function checkHealth() {
  const { error } = await supabase.from('sessions').select('id').limit(1);
  if (error) throw new Error(error.message);
  return true;
}

// ── Sessions ───────────────────────────────────────────────────────────────
export const api = {
  // Return all sessions ordered newest first
  getSessions: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  // Compute stats from sessions table
  getStats: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, status');
    if (error) throw new Error(error.message);
    return {
      total:     data.length,
      processed: data.filter((s) => s.status === 'processed').length,
      pending:   data.filter((s) => s.status === 'pending').length,
      error:     data.filter((s) => s.status === 'error').length,
    };
  },

  // Insert a new session row
  createSession: async (rawTranscript, language = 'hi-IN') => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ raw_transcript: rawTranscript, language, status: 'pending' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
