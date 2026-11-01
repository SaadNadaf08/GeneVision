async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
export const apiGet = url => request(url);
export const apiPost = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) });
export async function checkHealth() { return apiGet('/api/health'); }
