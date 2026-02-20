const API_BASE = import.meta.env.VITE_API_URL || "";

export function getApiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: { uid: string; email: string; role: string; name: string };
  error?: string;
}

export async function loginWithBackend(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(getApiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: data?.error || "Login failed. Please try again.",
    };
  }
  return data as LoginResponse;
}
