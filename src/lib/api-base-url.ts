const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();

// In dev, default to local API. In production, use same-origin unless explicitly configured.
const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin;

export const API_BASE_URL = normalizeBaseUrl(configuredBaseUrl || defaultBaseUrl);
