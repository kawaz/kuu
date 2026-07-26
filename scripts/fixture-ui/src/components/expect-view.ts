/**
 * expect の表示。
 *
 * expect の形は query 種別で大きく違う (parse は result/effects/sources、
 * definition_error は errors、complete は candidates、help は
 * command_path/usage/options、lower は greedy/entities)。よって
 * 「query ごとの表示順」だけを規定し、順に現れないキーは宣言順のまま後ろへ流す。
 * 未知のキーが来ても落ちない (spec が育つ前提)。
 */
import { el } from "../dom.ts";
import { jsonView } from "./json-view.ts";
import { isRecordList, mapTable, recordTable } from "./table.ts";
import type { QueryKind } from "../types.ts";

/** query ごとの表示順。ここに無いキーは後ろへ回る。 */
const KEY_ORDER: Record<QueryKind, string[]> = {
  parse: [
    "outcome",
    "errors",
    "result",
    "effects",
    "sources",
    "warnings",
    "interpretations",
    "fired_action",
    "tried_triggers",
    "help_entry",
  ],
  definition_error: ["outcome", "errors"],
  complete: ["outcome", "candidates"],
  help: [
    "outcome",
    "errors",
    "command_path",
    "usage",
    "description",
    "description_long",
    "commands",
    "positionals",
    "options",
    "types",
    "help_entry",
    "epilog",
    "render",
  ],
  lower: ["greedy", "entities", "positionals", "constraints", "templates"],
};

/** テーブル向きのキーと、その優先列順。 */
const TABLE_COLUMNS: Record<string, string[]> = {
  effects: ["entity", "op", "operand", "source"],
  errors: ["kind", "element", "args_pos", "reason", "path"],
  warnings: ["kind", "element"],
  candidates: ["spelling", "is_value", "origin", "term", "type", "completer", "meta"],
  options: [
    "spellings",
    "alias_spellings",
    "display_name",
    "value_structure",
    "help",
    "help_long",
    "help_group_name",
    "group",
    "default",
    "env",
    "required",
    "multiple",
    "hidden",
    "deprecated",
    "origin",
  ],
  greedy: ["exact", "value", "link", "seq", "ref"],
  commands: ["name", "help", "hidden", "deprecated"],
  positionals: ["name", "value_name", "type", "help", "required"],
};

/** sources のような「キー→スカラー」の map をテーブルにするか判定する。 */
function isScalarMap(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((v) => v === null || typeof v !== "object")
  );
}

function renderValue(key: string, value: unknown): HTMLElement {
  if (typeof value === "string") return el("code", { class: "scalar", text: value });
  if (typeof value === "boolean" || typeof value === "number") {
    return el("code", { class: "scalar", text: String(value) });
  }
  if (key in TABLE_COLUMNS && isRecordList(value)) {
    return recordTable(value as Record<string, unknown>[], TABLE_COLUMNS[key]!);
  }
  if ((key === "sources" || key === "result") && isScalarMap(value)) {
    return mapTable(value, key === "sources" ? "entity" : "key", key === "sources" ? "source" : "value");
  }
  return jsonView(value);
}

export function expectView(expect: Record<string, unknown>, query: QueryKind): HTMLElement {
  const order = KEY_ORDER[query] ?? [];
  const keys = [
    ...order.filter((k) => k in expect),
    ...Object.keys(expect).filter((k) => !order.includes(k)),
  ];

  return el(
    "div",
    { class: "expect" },
    ...keys.map((key) =>
      el(
        "div",
        { class: "expect-field" },
        el("div", { class: "expect-key", text: key }),
        el("div", { class: "expect-value" }, renderValue(key, expect[key])),
      ),
    ),
  );
}
