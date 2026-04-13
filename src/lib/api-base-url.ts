const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
const isPlaceholderBaseUrl = /your-render-backend-url\.onrender\.com|your-backend-service\.onrender\.com/i.test(
  configuredBaseUrl
);

// In dev, default to local API. In production, you must set VITE_API_BASE_URL.
const defaultBaseUrl = 'http://localhost:4000';

if (import.meta.env.PROD && !configuredBaseUrl) {
	// Helps diagnose Netlify -> Render fetch failures quickly.
	console.warn('VITE_API_BASE_URL is missing. Set it in your frontend host environment settings.');
}

if (import.meta.env.PROD && isPlaceholderBaseUrl) {
	console.warn(
		'VITE_API_BASE_URL is using a placeholder URL. Set it to your real Render service URL in Netlify environment variables.'
	);
}

export const API_BASE_URL = normalizeBaseUrl(configuredBaseUrl || defaultBaseUrl);
