import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_') &&
  !supabaseAnonKey.includes('YOUR_')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, metadata = {}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listCloudProjects(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCloudProject(project) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCloudProject(projectId, patch) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function appendCloudProjectFile(project, fileRecord) {
  const files = Array.isArray(project.files) ? project.files : [];
  return updateCloudProject(project.id, { files: [fileRecord, ...files], status: 'In production' });
}

export async function appendCloudProjectSound(project, soundRecord) {
  const analysis = project.analysis && typeof project.analysis === 'object' ? project.analysis : {};
  const generatedSounds = Array.isArray(analysis.generated_sounds) ? analysis.generated_sounds : [];
  return updateCloudProject(project.id, {
    analysis: { ...analysis, generated_sounds: [soundRecord, ...generatedSounds] },
    status: 'In production',
  });
}

export async function saveCloudProjectFeedback(project, feedbackRecord) {
  const analysis = project.analysis && typeof project.analysis === 'object' ? project.analysis : {};
  const feedback = Array.isArray(analysis.feedback) ? analysis.feedback : [];
  return updateCloudProject(project.id, {
    analysis: { ...analysis, feedback: [feedbackRecord, ...feedback] },
  });
}

export async function uploadProjectAudioToSupabase(userId, projectId, file) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${userId}/${projectId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from('infinity-audio').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return data;
}

export async function createSignedAudioUrl(path, expiresIn = 60 * 60) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.storage.from('infinity-audio').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || '';
}

export async function deleteCloudProject(projectId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
}
