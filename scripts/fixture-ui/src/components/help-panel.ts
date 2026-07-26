/**
 * help テキストのパネル。fixture の definition を今使えるパーサ (kuu-cli) に
 * 通した結果を出す — 事前生成しないので、fixture を編集したら次に開いた時点で
 * 最新になる。
 *
 * definition_error 系のように help を出せない fixture もある。その場合は
 * エラーを握り潰さず、kuu-cli の出力をそのまま失敗理由として見せる。
 */
import { fetchHelp } from "../api.ts";
import { el } from "../dom.ts";
import type { HelpResult } from "../types.ts";

function render(result: HelpResult): HTMLElement {
  if (result.ok) {
    return el(
      "div",
      {},
      el("code", { class: "help-command", text: result.command }),
      el("pre", { class: "help-text", text: result.text }),
    );
  }
  return el(
    "div",
    {},
    result.command && el("code", { class: "help-command", text: result.command }),
    el("p", { class: "help-error-title", text: "help を生成できません:" }),
    el("pre", { class: "help-error", text: result.reason }),
  );
}

/**
 * help は開くまで取りに行かない (fixture を開くたびに 340 回 spawn しても
 * 意味がないので、明示的に開いた時だけ生成する)。
 */
export function helpPanel(path: string, caseId: string | null = null): HTMLElement {
  const body = el("div", { class: "help-body", text: "読み込み中…" });
  let loaded = false;

  const panel = el(
    "details",
    { class: "help-panel" },
    el("summary", { text: "ヘルプ表示 (kuu-cli)" }),
    body,
  ) as HTMLDetailsElement;

  panel.addEventListener("toggle", () => {
    if (!panel.open || loaded) return;
    loaded = true;
    fetchHelp(path, caseId)
      .then((result) => body.replaceChildren(render(result)))
      .catch((e: unknown) => {
        loaded = false; // 通信失敗は再試行の余地を残す
        body.replaceChildren(
          el("pre", { class: "help-error", text: e instanceof Error ? e.message : String(e) }),
        );
      });
  });

  return panel;
}
