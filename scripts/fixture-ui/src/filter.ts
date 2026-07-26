/** 検索フォームの条件と、それを fixture 一覧に適用する規則。 */
import type { FixtureSummary, QueryKind } from "./types.ts";

export interface FilterState {
  /** 空白区切り AND。各語が path の部分文字列であること (大文字小文字無視)。 */
  path: string;
  /** 空白区切り AND。各語がいずれかの case id の部分文字列であること。 */
  id: string;
  /** チェックされた query 種別。既定は全部。 */
  queries: Set<QueryKind>;
}

export interface FilteredFixture {
  summary: FixtureSummary;
  /** id フィルタが有効なとき、条件を満たした case id。無効なら空配列。 */
  matchedCaseIds: string[];
}

function terms(input: string): string[] {
  return input.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * id 条件は「1 つの case が全語を含む」ではなく「fixture 内のどれかの case が
 * 各語を含む」で判定する — 語ごとに別 case を指して検索するのは意図と違うので、
 * 全語を含む case が 1 つでもあることを条件にする。
 */
function matchCaseIds(caseIds: string[], idTerms: string[]): string[] {
  return caseIds.filter((id) => {
    const lower = id.toLowerCase();
    return idTerms.every((t) => lower.includes(t));
  });
}

export function applyFilter(
  fixtures: FixtureSummary[],
  state: FilterState,
): FilteredFixture[] {
  const pathTerms = terms(state.path);
  const idTerms = terms(state.id);
  const result: FilteredFixture[] = [];

  for (const summary of fixtures) {
    if (!state.queries.has(summary.query)) continue;

    const lowerPath = summary.path.toLowerCase();
    if (!pathTerms.every((t) => lowerPath.includes(t))) continue;

    if (idTerms.length === 0) {
      result.push({ summary, matchedCaseIds: [] });
      continue;
    }
    const matched = matchCaseIds(summary.caseIds, idTerms);
    if (matched.length > 0) result.push({ summary, matchedCaseIds: matched });
  }
  return result;
}
