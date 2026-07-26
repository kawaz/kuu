/** サーバ API の薄いラッパ。fixture / help はキャッシュせず都度取る。 */
import type { Fixture, FixtureIndex, HelpResult } from "./types.ts";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export function fetchIndex(): Promise<FixtureIndex> {
  return getJson<FixtureIndex>("/api/fixtures");
}

export function fetchFixture(path: string): Promise<Fixture> {
  return getJson<Fixture>(`/api/fixture?path=${encodeURIComponent(path)}`);
}

export function fetchHelp(path: string, caseId: string | null): Promise<HelpResult> {
  const query =
    `path=${encodeURIComponent(path)}` + (caseId ? `&case=${encodeURIComponent(caseId)}` : "");
  return getJson<HelpResult>(`/api/help?${query}`);
}
