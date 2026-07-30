// The deployed backend on Render.
export const API_URL = "https://sheba-pai.onrender.com";

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