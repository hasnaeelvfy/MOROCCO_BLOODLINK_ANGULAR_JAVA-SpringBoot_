function resolveApiBaseUrl(): string {
  const fallback = 'http://localhost:8080';
  if (typeof window === 'undefined') {
    return fallback;
  }
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8080`;
  }
  return fallback;
}

export const API_BASE_URL = resolveApiBaseUrl();
