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
 * help は既定で開いた状態にする (定義と help を並べて読むのが監査の主目的なので、
 * 開く操作を挟ませない)。spawn は fixture を開いた 1 件ぶんだけで、一覧の 340 件を
 * 舐めるわけではない。閉じてから再度開いても取り直さない。
 */
export function helpPanel(path: string, caseId: string | null = null): HTMLElement {
  const body = el("div", { class: "help-body", text: "読み込み中…" });
  let loaded = false;

  const panel = el(
    "details",
    { class: "help-panel", open: "" },
    el("summary", { text: "ヘルプ表示 (kuu-cli)" }),
    body,
  ) as HTMLDetailsElement;

  const load = () => {
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
  };

  // open 属性付きで生成すると toggle は発火しないので初回は自分で呼ぶ。
  // 失敗後に閉じ→開きで再試行できるよう toggle も張っておく。
  panel.addEventListener("toggle", load);
  load();

  return panel;
}
