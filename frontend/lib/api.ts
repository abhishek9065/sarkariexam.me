const DEFAULT_PUBLIC_API_BASE = 'http://localhost:5000/api';

export function resolvePublicApiBase(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_PUBLIC_API_BASE;

  const trimmed = configured.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
