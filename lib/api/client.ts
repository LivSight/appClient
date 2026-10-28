import { track } from "@/lib/analytics/events";
import { normalizeEndpoint } from "@/lib/analytics/mappers";
import { authSession } from "@/lib/auth/session";

export type ApiFetchDeps = {
  getAccessToken: () => Promise<string | null>;
  /** Called after a 401; returns a new access token or null if refresh failed. */
  forceRefreshAccessToken: () => Promise<string | null>;
  fetchFn?: typeof fetch;
};

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  return headers;
}

export function createApiFetch(deps: ApiFetchDeps) {
  const fetchFn = deps.fetchFn ?? fetch;

  async function send(url: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
    const headers = buildHeaders(init);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetchFn(url, {
      ...init,
      headers,
    });
  }

  function reportServerError(res: Response, url: string): Response {
    if (res.status >= 500) {
      track("erreur_api", { endpoint: normalizeEndpoint(url), statut: res.status });
    }
    return res;
  }

  return async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = await deps.getAccessToken();
    const res = await send(url, init, token);
    if (res.status !== 401) return reportServerError(res, url);

    // Refresh once and retry once. If the refresh token itself is rejected,
    // the session layer clears storage and emits the invalidation event.
    const newToken = await deps.forceRefreshAccessToken();
    if (!newToken) return res;

    return reportServerError(await send(url, init, newToken), url);
  };
}

export const apiFetch = createApiFetch({
  getAccessToken: () => authSession.getAccessToken(),
  forceRefreshAccessToken: () => authSession.forceRefreshAccessToken(),
});
