import type { AuthRole, AuthUser } from "@/context/AuthContext";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AuthResponseData = {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export async function loginApi(payload: { email: string; password: string; role: AuthRole }) {
  return request<AuthResponseData>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function googleLoginApi(payload: { email: string; role: AuthRole }) {
  return request<AuthResponseData>("/auth/google-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutApi(accessToken?: string) {
  return request<null>("/auth/logout", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function refreshTokenApi(payload: { refreshToken: string }) {
  return request<AuthResponseData>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPasswordApi(payload: { email: string }) {
  return request<null>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changePasswordApi(payload: {
  currentPassword: string;
  newPassword: string;
  accessToken: string;
}) {
  const { accessToken, ...body } = payload;

  return request<null>("/auth/change-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}
