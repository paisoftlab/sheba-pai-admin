// Central API helper for the admin panel.
// Change this if your backend runs elsewhere. Admin runs on a computer,
// so "localhost" correctly points at your backend on the same machine.
export const API_URL = "http://localhost:3000";

// Authenticated fetch: attaches the stored admin token.
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("adminToken");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}