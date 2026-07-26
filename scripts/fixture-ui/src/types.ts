/** fixtures/**\/*.json の envelope とサーバ API の型。 */

export const QUERY_KINDS = [
  "parse",
  "definition_error",
  "complete",
  "lower",
  "help",
] as const;

export type QueryKind = (typeof QUERY_KINDS)[number];

/** case が持つ入力キー (expect 以外)。表示順もこの順に従う。 */
export const CASE_INPUT_KEYS = [
  "args",
  "args_before",
  "args_after",
  "env",
  "config",
  "config_files",
  "tty",
  "path",
  "depth",
  "category_mode",
] as const;

export interface FixtureCase {
  id: string;
  why: string;
  expect: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Fixture {
  why: string;
  query: QueryKind;
  definition: unknown;
  /** parse / definition_error / complete / help は cases を持つ。 */
  cases?: FixtureCase[];
  /** lower は cases を持たず、fixture 直下に expect / installers を持つ。 */
  expect?: Record<string, unknown>;
  installers?: string[];
}

/** 一覧用の要約 (definition / expect を含まないので 340 件でも軽い)。 */
export interface FixtureSummary {
  /** fixtures/ からの相対パス。API のキーであり、UI の表示名でもある。 */
  path: string;
  query: QueryKind;
  why: string;
  caseIds: string[];
}

export interface FixtureIndex {
  fixtures: FixtureSummary[];
  /** 読めなかったファイル (JSON parse error 等)。握り潰さず UI に出す。 */
  errors: { path: string; reason: string }[];
}

export type HelpResult =
  | { ok: true; text: string; command: string }
  | { ok: false; reason: string; command: string };
