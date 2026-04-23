const DEFAULT_PUBLIC_API_BASE = 'http://localhost:5000/api';
const DEFAULT_INTERNAL_API_BASE = 'http://backend:4000/api';

export function resolvePublicApiBase(): string {
  const configured = typeof window === 'undefined'
    ? (
        process.env.INTERNAL_API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        DEFAULT_INTERNAL_API_BASE
      )
    : (
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        DEFAULT_PUBLIC_API_BASE
      );

  const trimmed = configured.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
