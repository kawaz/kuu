/**
 * 同じ形のレコード列をテーブルにする。
 *
 * 列は「fixture に実際に現れたキー」から決める (固定の列順を先に置き、
 * 未知のキーは末尾へ回す)。spec が育ってキーが増えても列が落ちない。
 */
import { el } from "../dom.ts";
import { cellValue } from "./json-view.ts";

export function recordTable(
  rows: Record<string, unknown>[],
  preferredColumns: string[],
): HTMLElement {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);

  const columns = [
    ...preferredColumns.filter((c) => seen.has(c)),
    ...[...seen].filter((c) => !preferredColumns.includes(c)).sort(),
  ];

  return el(
    "table",
    { class: "records" },
    el("thead", {}, el("tr", {}, ...columns.map((c) => el("th", { text: c })))),
    el(
      "tbody",
      {},
      ...rows.map((row) =>
        el(
          "tr",
          {},
          ...columns.map((c) =>
            el("td", { class: c in row ? undefined : "absent", text: cellValue(row[c]) }),
          ),
        ),
      ),
    ),
  );
}

/** キーと値の 2 列テーブル (sources のような map 向け)。 */
export function mapTable(
  map: Record<string, unknown>,
  keyHeader: string,
  valueHeader: string,
): HTMLElement {
  return el(
    "table",
    { class: "records" },
    el("thead", {}, el("tr", {}, el("th", { text: keyHeader }), el("th", { text: valueHeader }))),
    el(
      "tbody",
      {},
      ...Object.entries(map).map(([k, v]) =>
        el("tr", {}, el("td", { text: k }), el("td", { text: cellValue(v) })),
      ),
    ),
  );
}

/** レコード列としてテーブル化できるか (すべてオブジェクトで、値がスカラーか短い構造)。 */
export function isRecordList(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => v !== null && typeof v === "object" && !Array.isArray(v))
  );
}
