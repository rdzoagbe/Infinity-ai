import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCloudProject, deleteCloudProject, getSupabaseSession, isSupabaseConfigured,
  listCloudProjects, signOutSupabase, supabase,
  appendCloudProjectFile, appendCloudProjectSound,
} from '../api/supabaseClient.js';

export const STORAGE_KEYS = {
  session: 'infinity_private_session_v3',
  projects: 'infinity_private_projects_v3',
};

export function loadJson(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
export function makeId(prefix = 'item') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

export function profileFromSupabaseUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Infinity Creator',
    role: user?.user_metadata?.role || 'Artist',
    language: user?.user_metadata?.language || 'English',
    signedInAt: new Date().toISOString(),
    authMode: 'supabase-cloud',
  };
}

export function normalizeProject(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist || 'Unknown Artist',
    type: row.type || 'Full song',
    genre: row.genre || 'Unknown',
    status: row.status || 'Draft',
    notes: row.notes || '',
    analysis: row.analysis || { generated_sounds: [], feedback: [], export_packages: [] },
    files: Array.isArray(row.files) ? row.files : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    cloud: Boolean(row.user_id),
  };
}

// Demo projects shown only for the demo account. Everything here is labelled
// "Demo data" in the UI and is never mixed with a real user's records.
export const DEMO_PROJECTS = [
  normalizeProject({
    id: 'demo_project_1',
    title: 'Demo — Sunrise Anthem',
    artist: 'Demo Artist',
    genre: 'Afrobeat',
    type: 'Vocal + Beat',
    status: 'Draft',
    notes: 'This is sample data so you can explore the interface. Create your own project to work with real audio.',
    files: [],
  }),
];

const SessionContext = createContext(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }) {
  const [profile, setProfile] = useState(() => loadJson(STORAGE_KEYS.session, null));
  const [projects, setProjects] = useState(() => loadJson(STORAGE_KEYS.projects, []));
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cloudMode = profile?.authMode === 'supabase-cloud' && isSupabaseConfigured;
  const demoMode = profile?.authMode === 'demo-local-private-mvp';

  const projectsRef = useRef(projects);
  const activeIdRef = useRef(activeProjectId);
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { activeIdRef.current = activeProjectId; }, [activeProjectId]);

  // Demo accounts see labelled demo data only.
  useEffect(() => {
    if (demoMode) setProjects(DEMO_PROJECTS);
  }, [demoMode]);

  // Supabase session restore + auth state subscription.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    getSupabaseSession().then((session) => {
      if (!active || !session?.user) return;
      const next = profileFromSupabaseUser(session.user);
      saveJson(STORAGE_KEYS.session, next);
      setProfile(next);
    }).catch(() => {});
    const subscription = supabase?.auth?.onAuthStateChange?.((_event, session) => {
      if (session?.user) {
        const next = profileFromSupabaseUser(session.user);
        saveJson(STORAGE_KEYS.session, next);
        setProfile(next);
      } else {
        setProfile((current) => (current?.authMode === 'supabase-cloud' ? null : current));
      }
    });
    return () => { active = false; subscription?.data?.subscription?.unsubscribe?.(); };
  }, []);

  // Local persistence (never for demo or cloud data).
  useEffect(() => {
    if (!cloudMode && !demoMode) saveJson(STORAGE_KEYS.projects, projects);
  }, [projects, cloudMode, demoMode]);

  // Cloud project load.
  useEffect(() => {
    if (!cloudMode || !profile?.id) return;
    setLoading(true); setError('');
    listCloudProjects(profile.id)
      .then((rows) => setProjects(rows.map(normalizeProject)))
      .catch((err) => setError(err.message || 'Could not load cloud projects.'))
      .finally(() => setLoading(false));
  }, [cloudMode, profile?.id]);

  const replaceProject = (updated) => {
    const normalized = normalizeProject(updated);
    setProjects((current) => current.map((p) => (p.id === normalized.id ? normalized : p)));
    return normalized;
  };

  const localUpdateProject = (projectId, updater) => {
    setProjects((current) => current.map((p) => {
      if (p.id !== projectId) return p;
      return { ...updater(p), updatedAt: new Date().toISOString() };
    }));
  };

  // Studio components report uploaded files / rendered assets through these
  // events; attach them to the active project.
  useEffect(() => {
    const targetProject = () => {
      const id = activeIdRef.current;
      return projectsRef.current.find((p) => p.id === id) || projectsRef.current[0] || null;
    };
    const onProjectFile = async (event) => {
      const project = targetProject();
      if (!project) return;
      const record = { id: event.detail?.id || event.detail?.file_id || makeId('file'), ...event.detail, linked_at: new Date().toISOString() };
      if (cloudMode) {
        try { replaceProject(await appendCloudProjectFile(project, record)); }
        catch (err) { setError(err.message || 'Could not save file to cloud project.'); }
        return;
      }
      localUpdateProject(project.id, (p) => ({ ...p, status: 'In production', files: [record, ...(Array.isArray(p.files) ? p.files : [])] }));
    };
    const onProjectSound = async (event) => {
      const project = targetProject();
      if (!project) return;
      const record = { id: event.detail?.id || event.detail?.asset_id || makeId('asset'), ...event.detail, linked_at: new Date().toISOString() };
      if (cloudMode) {
        try { replaceProject(await appendCloudProjectSound(project, record)); }
        catch (err) { setError(err.message || 'Could not save asset to cloud project.'); }
        return;
      }
      localUpdateProject(project.id, (p) => {
        const analysis = p.analysis || {};
        const list = Array.isArray(analysis.generated_sounds) ? analysis.generated_sounds : [];
        return { ...p, status: 'In production', analysis: { ...analysis, generated_sounds: [record, ...list] } };
      });
    };
    window.addEventListener('infinity:project-file', onProjectFile);
    window.addEventListener('infinity:project-sound', onProjectSound);
    return () => {
      window.removeEventListener('infinity:project-file', onProjectFile);
      window.removeEventListener('infinity:project-sound', onProjectSound);
    };
  }, [cloudMode]);

  const login = (nextProfile) => {
    saveJson(STORAGE_KEYS.session, nextProfile);
    setProfile(nextProfile);
  };

  const logout = async () => {
    if (cloudMode) await signOutSupabase().catch(() => {});
    localStorage.removeItem(STORAGE_KEYS.session);
    setProfile(null);
    setActiveProjectId(null);
    setProjects(loadJson(STORAGE_KEYS.projects, []));
  };

  const createProject = async (project) => {
    if (cloudMode) {
      const row = await createCloudProject({
        user_id: profile.id, title: project.title, artist: project.artist, type: project.type,
        genre: project.genre, status: project.status, notes: project.notes,
        analysis: project.analysis, files: project.files,
      });
      const normalized = normalizeProject(row);
      setProjects((current) => [normalized, ...current]);
      return normalized;
    }
    setProjects((current) => [project, ...current]);
    return project;
  };

  const deleteProject = async (id) => {
    if (cloudMode) await deleteCloudProject(id);
    setProjects((current) => current.filter((p) => p.id !== id));
  };

  const refreshProjects = async () => {
    if (cloudMode && profile?.id) {
      setLoading(true);
      try { setProjects((await listCloudProjects(profile.id)).map(normalizeProject)); }
      finally { setLoading(false); }
    } else if (!demoMode) {
      setProjects(loadJson(STORAGE_KEYS.projects, []));
    }
  };

  const value = useMemo(() => ({
    profile, login, logout,
    projects, createProject, deleteProject, refreshProjects, replaceProject, localUpdateProject,
    activeProjectId, setActiveProjectId,
    cloudMode, demoMode, loading, error, setError,
    // Data mode drives honest labelling in the UI:
    //   'empty' – signed in, no records yet
    //   'demo'  – demo account, labelled sample data
    //   'real'  – the user's own records
    dataMode: demoMode ? 'demo' : (projects.length === 0 ? 'empty' : 'real'),
  }), [profile, projects, activeProjectId, cloudMode, demoMode, loading, error]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
