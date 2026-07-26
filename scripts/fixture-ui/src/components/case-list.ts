/**
 * ケースリスト。既定は全 close (kawaz 要求)。
 *
 * ヘッダは id + 入力 (args 等) の要約で、開くと why / 入力の全体 / expect が出る。
 * 「この case が何を pin しているか」は why を読ませるのが目的なので、
 * 開いた側は幅を絞って折り返す (CSS 側)。
 */
import { el } from "../dom.ts";
import { CASE_INPUT_KEYS } from "../types.ts";
import type { FixtureCase, QueryKind } from "../types.ts";
import { expectView } from "./expect-view.ts";
import { jsonView } from "./json-view.ts";
import { mapTable } from "./table.ts";

/** ヘッダに出す 1 行要約。args があれば args、無ければ他の入力キーを拾う。 */
function inputSummary(c: FixtureCase): string {
  if (Array.isArray(c.args)) {
    return c.args.length === 0 ? "(引数なし)" : c.args.map((a) => String(a)).join(" ");
  }
  const parts: string[] = [];
  for (const key of CASE_INPUT_KEYS) {
    if (key === "args" || !(key in c)) continue;
    parts.push(`${key}=${JSON.stringify(c[key])}`);
  }
  return parts.length > 0 ? parts.join("  ") : "(入力なし)";
}

function inputsView(c: FixtureCase): HTMLElement | null {
  const keys = CASE_INPUT_KEYS.filter((k) => k in c);
  if (keys.length === 0) return null;
  return el(
    "div",
    { class: "expect" },
    ...keys.map((key) => {
      const value = c[key];
      const rendered =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? mapTable(value as Record<string, unknown>, "key", "value")
          : jsonView(value);
      return el(
        "div",
        { class: "expect-field" },
        el("div", { class: "expect-key", text: key }),
        el("div", { class: "expect-value" }, rendered),
      );
    }),
  );
}

export interface CaseListHandle {
  element: HTMLElement;
  setAllOpen(open: boolean): void;
}

export function caseList(
  cases: FixtureCase[],
  query: QueryKind,
  highlightIds: Set<string>,
): CaseListHandle {
  const details: HTMLDetailsElement[] = [];

  const items = cases.map((c) => {
    const inputs = inputsView(c);
    const node = el(
      "details",
      { class: highlightIds.has(c.id) ? "case matched" : "case" },
      el(
        "summary",
        {},
        el("span", { class: "case-id", text: c.id }),
        el("span", { class: "case-args", text: inputSummary(c) }),
      ),
      el(
        "div",
        { class: "case-body" },
        el("p", { class: "why", text: c.why }),
        inputs && el("h4", { text: "入力" }),
        inputs,
        el("h4", { text: "expect" }),
        expectView(c.expect, query),
      ),
    ) as HTMLDetailsElement;
    details.push(node);
    return node;
  });

  return {
    element: el("div", { class: "cases" }, ...items),
    setAllOpen(open: boolean) {
      for (const d of details) d.open = open;
    },
  };
}
