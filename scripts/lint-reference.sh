#!/usr/bin/env bash
# docs/REFERENCE.md (非正本の導出物) が正本語彙 (schema/*.json) を過不足なく
# 網羅しているかを機械検査する。正本はあくまで DESIGN.md / DR / schema であり、
# 本 lint は「REFERENCE から漏れた語彙」と「REFERENCE にしかない幽霊語彙」の
# 双方向を検出する (schema に存在しない/DESIGN に規定のない糖衣属性・拡張語彙
# は対象外 — 検査対象は下記 11 カテゴリの schema 由来語彙のみ)。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

ref="docs/REFERENCE.md"
wire_schema="schema/wire.schema.json"
descriptors="schema/builtin-descriptors.json"

if [ ! -f "$ref" ]; then
  echo "[FAIL] $ref が存在しません" >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

fail=0

# REFERENCE.md の `<!-- kuu-lint:vocab <marker> -->` ～ `<!-- kuu-lint:end -->`
# の間にある Markdown テーブル行 (`| \`key\` | ...`) から、行頭列のバッククォート
# 識別子だけを抜き出す。テーブル以外の行 (見出し・地の文) は無視する。
extract_vocab() {
  local marker="$1"
  awk -v marker="$marker" '
    $0 ~ ("<!-- kuu-lint:vocab " marker " -->") { flag=1; next }
    flag && $0 ~ /<!-- kuu-lint:end -->/ { flag=0; next }
    flag && /^\|/ {
      line = $0
      sub(/^\| */, "", line)
      if (match(line, /^`[^`]+`/)) {
        s = substr(line, RSTART + 1, RLENGTH - 2)
        print s
      }
    }
  ' "$ref"
}

# $1 = 表示ラベル, $2 = マーカー名, 期待語彙 (改行区切り) は stdin。
# 呼び出しは `jq ... > tmp; check_bidirectional ... < tmp` の 2 段で書く —
# `jq ... | check_bidirectional ...` だと右辺がサブシェルになり fail=1 が
# 親に伝播せず、FAIL を表示しながら exit 0 で終わる。
check_bidirectional() {
  local label="$1" marker="$2"
  local expected actual missing extra
  expected="$tmpdir/${marker}.expected"
  actual="$tmpdir/${marker}.actual"
  sort -u > "$expected"
  extract_vocab "$marker" | sort -u > "$actual"

  missing="$(comm -23 "$expected" "$actual")"
  extra="$(comm -13 "$expected" "$actual")"

  if [ -n "$missing" ]; then
    echo "[FAIL] $label: REFERENCE.md に未記載 (schema にあるが REFERENCE に無い):"
    echo "$missing" | sed 's/^/    - /'
    fail=1
  fi
  if [ -n "$extra" ]; then
    echo "[FAIL] $label: REFERENCE.md の幽霊語彙 (schema に実在しない):"
    echo "$extra" | sed 's/^/    - /'
    fail=1
  fi
  if [ -z "$missing" ] && [ -z "$extra" ]; then
    echo "[OK]   $label ($(wc -l < "$actual" | tr -d ' ') 語彙)"
  fi
}

# 1. ノード共通属性 (wire.schema.json $defs.node.properties)
jq -r '.["$defs"].node.properties | keys[]' "$wire_schema" > "$tmpdir/node-properties.raw"
check_bidirectional "node properties (§2)" "node-properties" < "$tmpdir/node-properties.raw"

# 2. scope config ダイヤル (wire.schema.json $defs.node.properties.config.properties)
jq -r '.["$defs"].node.properties.config.properties | keys[]' "$wire_schema" > "$tmpdir/config-keys.raw"
check_bidirectional "scope config keys (§4)" "config-keys" < "$tmpdir/config-keys.raw"

# 3. builtin filter 名 (builtin-descriptors.json .filters)
jq -r '.filters | keys[]' "$descriptors" > "$tmpdir/filters.raw"
check_bidirectional "builtin filters (§6)" "filters" < "$tmpdir/filters.raw"

# 4. builtin type factory 名 (builtin-descriptors.json .types)
jq -r '.types | keys[]' "$descriptors" > "$tmpdir/type-factories.raw"
check_bidirectional "builtin type factories (§3)" "type-factories" < "$tmpdir/type-factories.raw"

# 5. filter の invocation 引数名 (in_range: min/max, regex_match: pattern, DR-107 で
#    descriptor.config から invocation.parameters へ移動 — DSL 引数の呼び出しごとの意味論宣言)
jq -r '.filters[] | (.invocation.parameters // []) | .[].name' "$descriptors" > "$tmpdir/filter-config-keys.raw"
check_bidirectional "filter invocation parameters (§6)" "filter-config-keys" < "$tmpdir/filter-config-keys.raw"

# 6. type factory の config キー (number_parser/int_parser/bool_parser/tty)
jq -r '.types[] | (.config // {}) | keys[]' "$descriptors" > "$tmpdir/factory-config-keys.raw"
check_bidirectional "factory config keys (§3)" "factory-config-keys" < "$tmpdir/factory-config-keys.raw"

# 7. filter が emit しうる reason
jq -r '.filters[].reasons[]' "$descriptors" > "$tmpdir/filter-reasons.raw"
check_bidirectional "filter reasons (§7)" "filter-reasons" < "$tmpdir/filter-reasons.raw"

# 8. type factory が emit しうる reason
jq -r '.types[].reasons[]' "$descriptors" > "$tmpdir/factory-reasons.raw"
check_bidirectional "factory reasons (§7)" "factory-reasons" < "$tmpdir/factory-reasons.raw"

# 9. builtin cell fn 名 (builtin-descriptors.json .cell_fns)
jq -r '.cell_fns | keys[]' "$descriptors" > "$tmpdir/cell-fns.raw"
check_bidirectional "builtin cell_fns (§6b)" "cell-fns" < "$tmpdir/cell-fns.raw"

# 10. cell fn が emit しうる reason
jq -r '.cell_fns[].reasons[]' "$descriptors" > "$tmpdir/cell-fn-reasons.raw"
check_bidirectional "cell fn reasons (§7)" "cell-fn-reasons" < "$tmpdir/cell-fn-reasons.raw"

# 11. builtin completer 名 (builtin-descriptors.json .completers)
jq -r '.completers | keys[]' "$descriptors" > "$tmpdir/completers.raw"
check_bidirectional "builtin completers (§6c)" "completers" < "$tmpdir/completers.raw"

echo ""
if [ "$fail" -ne 0 ]; then
  echo "lint-reference: FAIL"
  exit 1
fi
echo "lint-reference: OK"
