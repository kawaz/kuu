---
title: リスト merge — piece レベル op 語彙 (add/remove/splice) とラダー合成
status: resolved
category: design
created: 2026-07-10T02:22:17+09:00
last_read:
open_entered: 2026-07-10T02:22:17+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-10T12:52:40+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-080","dr/DR-081","implemented"]
blocked_by:
origin: 自リポ TODO
---

# リスト merge — piece レベル op 語彙 (add/remove/splice) とラダー合成

## 概要

separator リスト値に merge 構文を導入する。canonical 例:

```
env: APP_FIELDS=ts,ip,method,path,ua
CLI: app --fields -ip,-ua,@,duration,ip
→ result [ts,method,path,duration,ip]
```

- piece は op 付き artifact に持ち上がる: `-x` = {remove, "x"} / `@` = {splice} / 素の piece = {add, payload} (set の縮退)
- **remove は継承リスト (下位席の勝者) への適用**、**@ は remove 適用後の継承リストの展開位置**、add は @ 相対の位置配置
- 認識は per-piece (piece[]→piece[] 座席や位相間 context は不要)。parse は payload のみ型付けし op を素通し。fold が op 列を順に解釈
- 実現は純データのみ (DR-045 §3 の「効果は純データ」不変)。クロージャ登録・位相間共有 context は不採用 (DR-077 の採用しなかった案「parser の old 依存化」と同根の理由)

## 背景

kawaz 裁定 2026-07-10、チャット議論より。

DR-077 は「old は CLI 席内、ラダーは選択であって合成ではない」と裁定済み。merge の @ は**下位席の値を参照する**ため、この原則への明示的で最小の例外として設計する:

- 席の値を「f(下位席の勝者)」という**遅延値**にする新 op 族
- **unset は f = identity の縮退形**という統一が成立 (unset = ラダーを開いて下位を素通し / merge = 下位を変換して通す)。DR-045 の「unset と default の差は committed フラグのみ」構造への自然な拡張
- update の old (CLI 席内、DR-077) とは別物 — update は席内畳み、merge はラダー解決時の合成

### 裁定済み事項

1. @ の参照先 = 下位席の勝者 (PATH 型ユースケースが本体) — kawaz 確認済み
2. opt-in 宣言 (merge: true 等) は**設けない** — 「大抵は --fields のような前置構造があり、kuu では頭のハイフンはそんなに気にしなくて良い」(kawaz)。値スロットは greedy raw 消費 (DR-041 §4) なので option 誤認の構造的心配もない
3. エスケープ規約 (literal "@"、`-` 始まりの正値、数値リストの `-5`、インデックスリスト用途) は**先送り** — 「今やるとこじゃなさそう」(kawaz)

### DR 起草時に決める残論点

- remove のみで @ 無しの場合の意味 (暗黙 splice か、継承破棄か)
- remove のマッチング (型付きリストでの値等価、重複要素の扱い — 全部消すか 1 個か)
- 同一値の remove → add (例の ip) の順序意味論の明文化
- effects oracle での piece op の見せ方 (op: "remove"/"splice" を effects に載せるか、載せるなら operand/argv_pos 帰属)
- 非 CLI 値源 (env/config 供給のリスト自体にマーカーが書かれた場合) に merge 構文が効くか
- DR-031 (選択原則) / DR-045 (op 語彙) / DR-077 (old の定義) への波及改訂の範囲

### 関連

- filter 座席格子の再命名議論 (piece の定義が op 付き artifact に精密化される — 命名 issue と同時期に扱う)
- kuu.mbt: accum-fold-update-default-ops (Update fold 実装が merge fold の足場になる)

## 受け入れ条件

- [ ] DR として merge op 語彙とラダー合成例外が裁定・起草される
- [ ] canonical 例 (APP_FIELDS) が conformance fixture 化される
- [ ] unset = f=identity 縮退の統一が DR-045 系の改訂に反映される

## 2026-07-10 追記: kawaz 裁定 (第 2 ラウンド) — 意味論が完全確定、DR-080 起草へ

- **merge は multiple registry の accumulator 語彙** (`multiple: {accumulator: "merge", separator: ...}`)。本 issue 冒頭の「opt-in 宣言は設けない」は「merge: true のような独立 node 属性を設けない」の意味に訂正 — マーカー構文は accumulator=merge 宣言要素にのみ適用される (DR-036/077 の「append/merge 等」の実体化)
- 評価規則 (L→R): marker なし発火 = cell 上書き / marker あり = merge モード (明示 @ 無しなら先頭に暗黙 @) / @ = old (再発火は直前状態、初回は下位席の勝者) を「それまでの remove を適用した形」で splice / remove は双方向 (以前の作業リストから全削除 + 以後の @ の splice 内容から全削除、以後の add には効かない)
- remove は全削除 (左 1 個ではない)
- escape: 先頭 `+` は直後が `-`/`@`/`+` の時のみ剥がす。`+` 単独は literal。`-` 単独は remove("") で operand は型 parse (number 型では not_a_number)
- canonical 例 11 + 追補 3 (`-a,d`→[b,c,d] / `@,-a,@`→[b,c,b,c] / `@,-a,a`≡`-a,@,a`→[b,c,a]) — DR-080 に収録
- 残: effects oracle での piece op の見せ方 (fixture 設計時に確定) / spec fixture 群 / kuu.mbt 実装
