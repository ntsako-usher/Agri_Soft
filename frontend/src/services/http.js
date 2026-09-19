import { config } from '../config';
import { getAccessToken } from './authStorage';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Thin fetch wrapper: adds the base URL, JSON headers and the JWT token.
export async function http(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(`${config.apiBaseUrl}${path}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const token = getAccessToken();
  const response = await fetch(url, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // AuthContext listens for this and signs the user out.
    window.dispatchEvent(new Event('softagri:unauthorized'));
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.detail || `Request failed (${response.status})`, response.status, payload);
  }
  return payload;
}
