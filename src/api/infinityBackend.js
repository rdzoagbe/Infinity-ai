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

export async function masterAudioOnBackend(fileId, mode = "Custom AI adaptive", strength = 80) {
  const response = await fetch(`${API_BASE}/api/v1/audio/master`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, mode, strength }),
  });

  return parseResponse(response, "Mastering job failed");
}

export async function separateStemsOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/audio/separate-stems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  return parseResponse(response, "Stem separation job failed");
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
