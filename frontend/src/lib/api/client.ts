const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('minihub_token', token);
    } else {
      localStorage.removeItem('minihub_token');
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('minihub_token');
  }
  return authToken;
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

let refreshTokenPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        setAuthToken(null);
        return null;
      }

      const data = await res.json().catch(() => ({}));
      const newAccessToken = data?.data?.accessToken;
      if (newAccessToken) {
        setAuthToken(newAccessToken);
        return newAccessToken;
      }

      setAuthToken(null);
      return null;
    } catch {
      setAuthToken(null);
      return null;
    } finally {
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = getAuthToken();
  const defaultHeaders: Record<string, string> = {};

  // Only set Content-Type: application/json if there is a body and it is not FormData
  if (customConfig.body && !(customConfig.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include', // sends refresh cookie
  });

  // If 401 Unauthorized, try to refresh token once and retry (excluding auth routes)
  const isAuthRoute =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh');

  if (response.status === 401 && !isAuthRoute) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = {
        ...defaultHeaders,
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      response = await fetch(url, {
        ...customConfig,
        headers: retryHeaders,
        credentials: 'include',
      });
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = data.error || {};
    throw new ApiError(
      response.status,
      err.code || 'UNKNOWN_ERROR',
      err.message || 'Ocorreu um erro na requisição',
      err.details
    );
  }

  return data as T;
}

