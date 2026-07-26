/**
 * フィルタ結果の fixture 一覧。クリックで詳細を開く。
 *
 * 行は「path + query バッジ + ケース数」だけの軽量ノードにして、340 件を
 * 一度に描いても操作が重くならないようにしている。重いのは case/expect の
 * 描画なので、そちらは詳細ペインで 1 fixture 分だけ描く。
 */
import { el } from "../dom.ts";
import type { FilteredFixture } from "../filter.ts";

/** 幅が足りない時に省くのはディレクトリ側なので、path を 2 つに割る。 */
function dirOf(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut < 0 ? "" : path.slice(0, cut + 1);
}

function fileOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function fixtureList(
  items: FilteredFixture[],
  selectedPath: string | null,
  onSelect: (item: FilteredFixture) => void,
): HTMLElement {
  if (items.length === 0) {
    return el("p", { class: "empty", text: "該当する fixture はありません。" });
  }

  return el(
    "ul",
    { class: "fixture-list" },
    ...items.map((item) => {
      const { summary, matchedCaseIds } = item;
      const caseLabel =
        matchedCaseIds.length > 0
          ? `${matchedCaseIds.length}/${summary.caseIds.length} case`
          : summary.caseIds.length > 0
            ? `${summary.caseIds.length} case`
            : "case なし";

      return el(
        "li",
        { class: summary.path === selectedPath ? "selected" : undefined },
        el(
          "button",
          { type: "button", class: "row", onclick: () => onSelect(item) },
          el("span", { class: `badge badge-${summary.query}`, text: summary.query }),
          el(
            "span",
            { class: "row-path", title: summary.path },
            el("span", { class: "row-dir", text: dirOf(summary.path) }),
            el("span", { class: "row-file", text: fileOf(summary.path) }),
          ),
          el("span", { class: "row-cases", text: caseLabel }),
        ),
      );
    }),
  );
}
