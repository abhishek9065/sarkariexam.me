import type { Page, Request, Route } from '@playwright/test';

type JsonValue = Record<string, unknown> | unknown[];

type AdminApiMockOptions = {
  authenticated?: boolean;
  responses?: Record<string, JsonValue>;
  onRequest?: (request: Request) => void;
};

export const MOCK_ADMIN = {
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
  const { authenticated = true, responses = {}, onRequest } = options;

  await page.route(/\/api(?:-e2e)?\//, async route => {
    const request = route.request();
    const url = new URL(request.url());
    onRequest?.(request);

    if (request.method() === 'OPTIONS') return json(route, {});

    if (url.pathname.endsWith('/auth/me')) {
      return authenticated
        ? json(route, { data: { user: MOCK_ADMIN } })
        : json(route, { error: 'unauthorized' }, 401);
    }

    const response = Object.entries(responses).find(([path]) => url.pathname.endsWith(path));
    if (response) return json(route, response[1]);

    return json(route, { error: 'No E2E mock is defined for this endpoint.' }, 503);
  });
}
