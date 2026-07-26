/** JSON を整形表示する末端コンポーネント。テーブル化しない値はすべてここへ落ちる。 */
import { el } from "../dom.ts";

/**
 * 配列やオブジェクトの葉 (スカラーだけを含む短いもの) は 1 行に畳む。
 * effects の operand のような小さな値が縦に伸びると読みにくいため。
 */
function stringify(value: unknown): string {
  const compact = JSON.stringify(value);
  if (compact !== undefined && compact.length <= 72) return compact;
  return JSON.stringify(value, null, 2);
}

export function jsonView(value: unknown): HTMLElement {
  return el("pre", { class: "json", text: stringify(value) });
}

/** テーブルのセルに入れる短い値 (undefined は空欄)。 */
export function cellValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
