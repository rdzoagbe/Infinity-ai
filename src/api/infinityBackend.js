import { supabase } from "./supabaseClient.js";

const API_BASE = import.meta.env.VITE_INFINITY_API_URL || "http://localhost:8000";

// Stable per-browser id: scopes anonymous (local-mode) users' records on the
// backend so one visitor cannot read another's files by guessing ids.
function clientId() {
  try {
    let id = localStorage.getItem("infinity_client_id_v1");
    if (!id) {
      id = (crypto.randomUUID?.() || Math.random().toString(16).slice(2) + Date.now().toString(16)).replace(/-/g, "");
      localStorage.setItem("infinity_client_id_v1", id);
    }
    return id;
  } catch {
    return "";
  }
}

async function authHeaders() {
  const headers = {};
  const id = clientId();
  if (id) headers["X-Infinity-Client"] = id;
  try {
    const { data } = (await supabase?.auth?.getSession?.()) || {};
    const token = data?.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // Supabase not configured — anonymous client id only.
  }
  return headers;
}

async function apiFetch(url, options = {}) {
  const headers = { ...(await authHeaders()), ...(options.headers || {}) };
  return fetch(url, { ...options, headers });
}

async function parseResponse(response, fallbackMessage) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.detail || payload?.message || fallbackMessage;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return payload;
}

export function backendUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export async function checkBackendHealth() {
  const response = await apiFetch(`${API_BASE}/health`);
  return parseResponse(response, "Backend health check failed");
}

export async function uploadAudioToBackend(file) {
  const body = new FormData();
  body.append("file", file);

  const response = await apiFetch(`${API_BASE}/api/v1/audio/upload`, {
    method: "POST",
    body,
  });

  return parseResponse(response, "Upload failed");
}

export async function analyzeAudioOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Analysis failed");
}

export async function masterAudioOnBackend(fileId, mode = "Custom AI adaptive", strength = 80, platform = "spotify", airBoost = false, warmth = 0.0, lowEq = 0.0, midEq = 0.0, highEq = 0.0, targetLufs = null, tpCeiling = null) {
  const body = { file_id: fileId, mode, strength, platform, air_boost: airBoost, warmth, low_eq: lowEq, mid_eq: midEq, high_eq: highEq };
  if (targetLufs != null) body.target_lufs = targetLufs;
  if (tpCeiling != null) body.tp_ceiling = tpCeiling;
  const response = await apiFetch(`${API_BASE}/api/v1/audio/master`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse(response, "Mastering job failed");
}

export async function cleanFullMixOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/clean-mix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  return parseResponse(response, "Mix cleaning failed");
}

export async function enhanceMixOnBackend(fileId, presenceBoost = true, reverbAmount = 0.2, stereoWidth = 1.3, busCompress = true) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/enhance-mix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      presence_boost: presenceBoost,
      reverb_amount: reverbAmount,
      stereo_width: stereoWidth,
      bus_compress: busCompress,
    }),
  });
  return parseResponse(response, "Mix enhancement failed");
}

export async function cleanVocalsOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/vocal/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Vocal cleaning failed");
}

// params: the full Infinity chain control surface — see chains.VOCAL_BEAT_DEFAULTS
// on the backend. All values are validated and clamped server-side.
export async function mixVocalBeatOnBackend(vocalFileId, beatFileId, params = {}) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/mix-vocal-beat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vocal_file_id: vocalFileId,
      beat_file_id: beatFileId,
      vocal_gain: params.vocalGain ?? 1.0,
      beat_gain: params.beatGain ?? 0.85,
      vocal_mute: params.vocalMute ?? false,
      beat_mute: params.beatMute ?? false,
      presence: params.presence ?? 2.0,
      air: params.air ?? 1.8,
      clarity: params.clarity ?? 0.0,
      warmth: params.warmth ?? 0.25,
      deess: params.deess ?? 0.5,
      compression: params.compression ?? 0.5,
      reverb_amount: params.reverb ?? 0.2,
      delay_amount: params.delay ?? 0.0,
      beat_stereo_width: params.beatStereoWidth ?? 1.5,
      bus_compress: params.busCompress ?? true,
    }),
  });

  return parseResponse(response, "Mix failed");
}

export async function separateStemsOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/separate-stems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Stem separation job failed");
}

export async function previewStyleOnBackend(fileId, mode = "Custom AI adaptive", strength = 72, warmth = 0.3) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/style-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, mode, strength, warmth }),
  });
  return parseResponse(response, "Style preview failed");
}

export async function generateSoundOnBackend(prompt, intensity = 68, genre = "Cinematic", emotion = "Mystic") {
  const response = await apiFetch(`${API_BASE}/api/v1/sound/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, intensity, genre, emotion }),
  });

  return parseResponse(response, "Sound generation failed");
}

export async function exportPackageOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/export/package`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Export package job failed");
}

export async function getBackendJob(jobId) {
  const response = await apiFetch(`${API_BASE}/api/v1/jobs/${jobId}`);
  return parseResponse(response, "Job lookup failed");
}

export async function pollUntilComplete(jobId, onProgress = null, intervalMs = 1200) {
  const MAX_POLLS = 180; // 3.6 minutes max
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const job = await getBackendJob(jobId);
    if (onProgress && job.progress != null) onProgress(job.progress, job.message || '');
    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(job.message || 'Job failed');
  }
  throw new Error('Operation timed out after 3 minutes');
}

export async function uploadAndMeasureLufsOnBackend(file) {
  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await apiFetch(`${API_BASE}/api/v1/audio/upload`, { method: "POST", body: formData });
  const uploadData = await parseResponse(uploadRes, "Reference upload failed");
  const fileId = uploadData?.file?.file_id;
  if (!fileId) throw new Error("No file ID from reference upload");
  const analyzeRes = await apiFetch(`${API_BASE}/api/v1/audio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const analyzeData = await parseResponse(analyzeRes, "Reference analyze failed");
  return analyzeData?.integrated_lufs ?? null;
}

export async function buildReleasePackageOnBackend(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/export/release-package`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  return parseResponse(response, "Release package failed");
}

export async function transformStyleOnBackend(fileId, mode, strength, duration = 20) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/transform-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, mode, strength, duration }),
  });
  return parseResponse(response, 'Style transform failed');
}

export async function analyzeAiOnBackend(fileId, genre) {
  const response = await apiFetch(`${API_BASE}/api/v1/audio/analyze-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, genre }),
  });
  return parseResponse(response, 'AI analysis failed');
}

export async function fetchFileInfo(fileId) {
  const response = await apiFetch(`${API_BASE}/api/v1/files/${fileId}`);
  return parseResponse(response, "File not found");
}

export { API_BASE };