const API_BASE = import.meta.env.VITE_INFINITY_API_URL || "http://localhost:8000";

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
  const response = await fetch(`${API_BASE}/health`);
  return parseResponse(response, "Backend health check failed");
}

export async function uploadAudioToBackend(file) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/audio/upload`, {
    method: "POST",
    body,
  });

  return parseResponse(response, "Upload failed");
}

export async function analyzeAudioOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/audio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Analysis failed");
}

export async function mixAudioOnBackend(fileId, mode = "Custom AI adaptive", strength = 72) {
  const response = await fetch(`${API_BASE}/api/v1/audio/mix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, mode, strength }),
  });

  return parseResponse(response, "Mix job failed");
}

export async function masterAudioOnBackend(fileId, mode = "Custom AI adaptive", strength = 80, platform = "spotify", airBoost = false, warmth = 0.0) {
  const response = await fetch(`${API_BASE}/api/v1/audio/master`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, mode, strength, platform, air_boost: airBoost, warmth }),
  });

  return parseResponse(response, "Mastering job failed");
}

export async function cleanFullMixOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/audio/clean-mix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  return parseResponse(response, "Mix cleaning failed");
}

export async function enhanceMixOnBackend(fileId, presenceBoost = true, reverbAmount = 0.2, stereoWidth = 1.3, busCompress = true) {
  const response = await fetch(`${API_BASE}/api/v1/audio/enhance-mix`, {
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
  const response = await fetch(`${API_BASE}/api/v1/vocal/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Vocal cleaning failed");
}

export async function mixVocalBeatOnBackend(
  vocalFileId, beatFileId,
  vocalGain = 1.0, beatGain = 0.85,
  vocalPresenceBoost = true, beatStereoWidth = 1.5, busCompress = true,
  reverbAmount = 0.2,
) {
  const response = await fetch(`${API_BASE}/api/v1/audio/mix-vocal-beat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vocal_file_id: vocalFileId,
      beat_file_id: beatFileId,
      vocal_gain: vocalGain,
      beat_gain: beatGain,
      vocal_presence_boost: vocalPresenceBoost,
      beat_stereo_width: beatStereoWidth,
      bus_compress: busCompress,
      reverb_amount: reverbAmount,
    }),
  });

  return parseResponse(response, "Mix failed");
}

export async function separateStemsOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/audio/separate-stems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Stem separation job failed");
}

export async function generateSoundOnBackend(prompt, intensity = 68, genre = "Cinematic", emotion = "Mystic") {
  const response = await fetch(`${API_BASE}/api/v1/sound/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, intensity, genre, emotion }),
  });

  return parseResponse(response, "Sound generation failed");
}

export async function exportPackageOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/export/package`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Export package job failed");
}

export async function getBackendJob(jobId) {
  const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);
  return parseResponse(response, "Job lookup failed");
}

export { API_BASE };