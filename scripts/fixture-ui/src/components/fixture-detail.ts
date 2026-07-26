/**
 * fixture 詳細ビュー。path / query / why / 定義 JSON / ヘルプ / ケースリスト。
 *
 * lower fixture は cases を持たず fixture 直下に expect / installers を持つので、
 * ケースリストの代わりに fixture 全体の expect を出す。
 */
import { fetchFixture } from "../api.ts";
import { el } from "../dom.ts";
import type { Fixture } from "../types.ts";
import { caseList } from "./case-list.ts";
import { expectView } from "./expect-view.ts";
import { helpPanel } from "./help-panel.ts";
import { jsonView } from "./json-view.ts";

function definitionPanel(fixture: Fixture): HTMLElement {
  return el(
    "details",
    { class: "def-panel", open: true },
    el("summary", { text: "定義 JSON" }),
    jsonView(fixture.definition),
  );
}

function casesSection(fixture: Fixture, highlightIds: Set<string>): HTMLElement {
  if (!fixture.cases) {
    // lower fixture: fixture 単位の expect が本体。
    return el(
      "section",
      {},
      el("h3", { text: "expect (fixture 単位)" }),
      fixture.installers
        ? el("p", { class: "installers", text: `installers: ${fixture.installers.join(", ")}` })
        : null,
      expectView(fixture.expect ?? {}, fixture.query),
    );
  }

  const list = caseList(fixture.cases, fixture.query, highlightIds);
  const header = el(
    "div",
    { class: "cases-header" },
    el("h3", { text: `ケース (${fixture.cases.length})` }),
    el("button", { type: "button", text: "全て開く", onclick: () => list.setAllOpen(true) }),
    el("button", { type: "button", text: "全て閉じる", onclick: () => list.setAllOpen(false) }),
  );
  return el("section", {}, header, list.element);
}

export function fixtureDetail(path: string, highlightIds: Set<string>): HTMLElement {
  const container = el("div", { class: "detail", text: "読み込み中…" });

  fetchFixture(path)
    .then((fixture) => {
      container.replaceChildren(
        el(
          "header",
          { class: "detail-header" },
          el("code", { class: "detail-path", text: `fixtures/${path}` }),
          el("span", { class: `badge badge-${fixture.query}`, text: fixture.query }),
        ),
        el("p", { class: "why", text: fixture.why }),
        definitionPanel(fixture),
        helpPanel(path),
        casesSection(fixture, highlightIds),
      );
    })
    .catch((e: unknown) => {
      container.replaceChildren(
        el("pre", { class: "help-error", text: e instanceof Error ? e.message : String(e) }),
      );
    });

  return container;
}
