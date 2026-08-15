const BASE = ""; // 같은 서버에서 프론트+백엔드를 같이 서빙하므로 상대경로 사용

function getPassword() {
  return localStorage.getItem("app_password") || "";
}
function setPassword(pw) {
  localStorage.setItem("app_password", pw);
}
function clearPassword() {
  localStorage.removeItem("app_password");
  localStorage.removeItem("app_role");
}
function getRole() {
  return localStorage.getItem("app_role") || "";
}
function setRole(role) {
  localStorage.setItem("app_role", role);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-app-password": getPassword(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let err = { error: `요청 실패 (${res.status})` };
    try { err = await res.json(); } catch {}
    const e = new Error(err.error || "요청 실패");
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (password) => apiFetch("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  listStores: () => apiFetch("/api/stores"),
  createStore: (name) => apiFetch("/api/stores", { method: "POST", body: JSON.stringify({ name }) }),
  renameStore: (id, name) => apiFetch(`/api/stores/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteStore: (id) => apiFetch(`/api/stores/${id}`, { method: "DELETE" }),
  getConfig: (id) => apiFetch(`/api/stores/${id}/config`),
  putConfig: (id, config) => apiFetch(`/api/stores/${id}/config`, { method: "PUT", body: JSON.stringify(config) }),
  getSchedule: (id) => apiFetch(`/api/stores/${id}/schedule`),
  putSchedule: (id, schedule) => apiFetch(`/api/stores/${id}/schedule`, { method: "PUT", body: JSON.stringify(schedule) }),
  getBackup: () => apiFetch("/api/backup"),
  restoreBackup: (backup) => apiFetch("/api/restore", { method: "POST", body: JSON.stringify(backup) }),
};

export { getPassword, setPassword, clearPassword, getRole, setRole };
