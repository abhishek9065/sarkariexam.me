import type { Page, Request, Route } from '@playwright/test';
import type { AdminRole } from '../lib/types';

type JsonValue = Record<string, unknown> | unknown[];
type MockAdminUser = {
  id: string;
  email: string;
  username: string;
  role: AdminRole;
  isActive: boolean;
};

type AdminApiMockOptions = {
  authenticated?: boolean;
  user?: MockAdminUser;
  responses?: Record<string, JsonValue>;
  onRequest?: (request: Request) => void;
};

export const MOCK_ADMIN: MockAdminUser = {
  id: 'e2e-admin',
  email: 'admin-e2e@example.test',
  username: 'E2E Admin',
  role: 'superadmin',
  isActive: true,
};

function json(route: Route, body: JsonValue, status = 200) {
  const origin = route.request().headers().origin ?? 'http://127.0.0.1:3001';
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': origin,
    },
    body: JSON.stringify(body),
  });
}

export async function mockAdminApi(page: Page, options: AdminApiMockOptions = {}) {
  const { authenticated = true, user = MOCK_ADMIN, responses = {}, onRequest } = options;

  await page.route(/\/api(?:-e2e)?\//, async route => {
    const request = route.request();
    const url = new URL(request.url());
    onRequest?.(request);

    if (request.method() === 'OPTIONS') return json(route, {});

    if (url.pathname.endsWith('/auth/csrf')) {
      return json(route, { data: { csrfToken: 'e2e-csrf-token' } });
    }

    if (url.pathname.endsWith('/auth/me')) {
      return authenticated
        ? json(route, { data: { user } })
        : json(route, { error: 'unauthorized' }, 401);
    }

    const method = request.method().toUpperCase();
    const response = Object.entries(responses).find(([key]) => {
      const methodMatch = key.match(/^([A-Z]+)\s+(.+)$/);
      if (methodMatch) {
        return methodMatch[1] === method && url.pathname.endsWith(methodMatch[2]);
      }
      return url.pathname.endsWith(key);
    });
    if (response) return json(route, response[1]);

    return json(route, { error: 'No E2E mock is defined for this endpoint.' }, 503);
  });
}
