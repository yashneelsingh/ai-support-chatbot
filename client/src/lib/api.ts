const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE = (configuredApiUrl || "/api").replace(/\/$/, "");
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() ||
  (API_BASE.startsWith("http") ? new URL(API_BASE).origin : undefined);

let refreshPromise: Promise<string> | null = null;

const getStorage = () => (typeof window === "undefined" ? null : window.localStorage);

async function refreshAccessToken(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");
        const data = await response.json();
        if (!data.accessToken) throw new Error("Refresh response did not include an access token");
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const storage = getStorage();
  const token = storage?.getItem("accessToken");
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 token expiration
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    const refreshToken = storage?.getItem("refreshToken");
    if (refreshToken && storage) {
      try {
        const accessToken = await refreshAccessToken(refreshToken);
        storage.setItem("accessToken", accessToken);
        headers.set("Authorization", `Bearer ${accessToken}`);
        response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      } catch (e) {
        console.error("Refresh error", e);
        storage.removeItem("accessToken");
        storage.removeItem("refreshToken");
        storage.removeItem("user");
        if (typeof window !== "undefined") window.location.assign("/login");
      }
    } else if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(
        "The API is unavailable. Start the backend and check its database connections.",
      );
    }
    throw new Error(data?.message || `HTTP error ${response.status}`);
  }
  return data;
}
