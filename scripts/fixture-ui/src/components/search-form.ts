/** 検索フォーム: path フィルタ / id フィルタ / query 種別チェックボックス。 */
import { el } from "../dom.ts";
import { QUERY_KINDS } from "../types.ts";
import type { QueryKind } from "../types.ts";
import type { FilterState } from "../filter.ts";

export function searchForm(
  counts: Map<QueryKind, number>,
  onChange: (state: FilterState) => void,
): { element: HTMLElement; state: FilterState } {
  const state: FilterState = {
    path: "",
    id: "",
    queries: new Set<QueryKind>(QUERY_KINDS), // 既定は全チェック
  };

  const emit = () => onChange(state);

  const pathInput = el("input", {
    type: "search",
    id: "filter-path",
    placeholder: "空白区切り AND (例: parse merge)",
    oninput: (e: Event) => {
      state.path = (e.target as HTMLInputElement).value;
      emit();
    },
  });

  const idInput = el("input", {
    type: "search",
    id: "filter-id",
    placeholder: "空白区切り AND (例: last wins)",
    oninput: (e: Event) => {
      state.id = (e.target as HTMLInputElement).value;
      emit();
    },
  });

  const checkboxes = QUERY_KINDS.map((kind) => {
    const box = el("input", {
      type: "checkbox",
      checked: true,
      onchange: (e: Event) => {
        if ((e.target as HTMLInputElement).checked) state.queries.add(kind);
        else state.queries.delete(kind);
        emit();
      },
    });
    return el(
      "label",
      { class: `query-toggle query-${kind}` },
      box,
      el("span", { text: `${kind} (${counts.get(kind) ?? 0})` }),
    );
  });

  const element = el(
    "form",
    {
      class: "search",
      onsubmit: (e: Event) => e.preventDefault(),
    },
    el(
      "div",
      { class: "field" },
      el("label", { for: "filter-path", text: "path filter" }),
      pathInput,
    ),
    el("div", { class: "field" }, el("label", { for: "filter-id", text: "id filter" }), idInput),
    el(
      "div",
      { class: "field" },
      el("label", { text: "query types" }),
      el("div", { class: "query-toggles" }, ...checkboxes),
    ),
  );

  return { element, state };
}
