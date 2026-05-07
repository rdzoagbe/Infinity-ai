const API_BASE = import.meta.env.VITE_INFINITY_API_URL || "http://localhost:8000";

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Backend health check failed");
  return response.json();
}

export async function uploadAudioToBackend(file) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/audio/upload`, {
    method: "POST",
    body,
  });

  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

export async function analyzeAudioOnBackend(fileId) {
  const response = await fetch(`${API_BASE}/api/v1/audio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!response.ok) throw new Error("Analysis failed");
  return response.json();
}

export { API_BASE };