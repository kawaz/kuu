/** 画面の組み立てと状態遷移。 */
import "./style.css";
import { fetchIndex } from "./api.ts";
import { applyFilter } from "./filter.ts";
import type { FilterState, FilteredFixture } from "./filter.ts";
import { append, clear, el } from "./dom.ts";
import { fixtureDetail } from "./components/fixture-detail.ts";
import { fixtureList } from "./components/fixture-list.ts";
import { searchForm } from "./components/search-form.ts";
import type { FixtureIndex, QueryKind } from "./types.ts";

const app = document.getElementById("app")!;

function countByQuery(index: FixtureIndex): Map<QueryKind, number> {
  const counts = new Map<QueryKind, number>();
  for (const f of index.fixtures) counts.set(f.query, (counts.get(f.query) ?? 0) + 1);
  return counts;
}

function totalCases(items: FilteredFixture[]): number {
  return items.reduce((sum, i) => sum + i.summary.caseIds.length, 0);
}

function mount(index: FixtureIndex): void {
  let selected: string | null = null;
  let filtered: FilteredFixture[] = [];

  const listPane = el("div", { class: "list-pane" });
  const detailPane = el("div", { class: "detail-pane" });
  const countLabel = el("p", { class: "count" });

  const select = (item: FilteredFixture) => {
    selected = item.summary.path;
    renderList();
    clear(detailPane);
    detailPane.append(fixtureDetail(item.summary.path, new Set(item.matchedCaseIds)));
  };

  const renderList = () => {
    clear(listPane);
    listPane.append(fixtureList(filtered, selected, select));
  };

  const onFilterChange = (state: FilterState) => {
    filtered = applyFilter(index.fixtures, state);
    countLabel.textContent = `${filtered.length} / ${index.fixtures.length} fixture · ${totalCases(filtered)} case`;
    renderList();
  };

  const form = searchForm(countByQuery(index), onFilterChange);

  append(
    app,
    el(
      "header",
      { class: "app-header" },
      el("h1", { text: "kuu conformance fixtures" }),
      countLabel,
    ),
    form.element,
    index.errors.length > 0
      ? el(
          "div",
          { class: "load-errors" },
          el("strong", { text: `読み込めなかった fixture が ${index.errors.length} 件あります:` }),
          el(
            "ul",
            {},
            ...index.errors.map((e) => el("li", { text: `fixtures/${e.path}: ${e.reason}` })),
          ),
        )
      : null,
    el("div", { class: "panes" }, listPane, detailPane),
  );

  detailPane.append(
    el("p", { class: "empty", text: "左の一覧から fixture を選んでください。" }),
  );
  onFilterChange(form.state);
}

fetchIndex()
  .then(mount)
  .catch((e: unknown) => {
    app.append(
      el("pre", {
        class: "help-error",
        text: `fixture 一覧を取得できません: ${e instanceof Error ? e.message : String(e)}`,
      }),
    );
  });
