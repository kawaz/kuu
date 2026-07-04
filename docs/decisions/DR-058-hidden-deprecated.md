# DR-058: hidden / deprecated の挙動 — 露出制御は表示層、警告は ParserContext.warnings

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-011。DESIGN §14 の「フィールド名のみ予約、挙動は別 DR」の解消。本セッションで確定。

## 決定

### 1. hidden: true — 表示層からの除外、受理は不変

- help 一覧と補完候補の**両方から除外**する (どちらも表示層の関心で、判断は help / completion installer の参照 DR-056)
- **パース挙動 (CLI からの受理可否) には影響しない** — 隠し要素は普通に起動できる
- 「--help-all で hidden も表示」のような opt-in はレンダラの関心 (AST 契約ではない)

### 2. deprecated: true — 受理 + 構造化警告

- 受理は不変。**起動されたら ParserContext の warnings リストに構造化警告を積む** (DR-016 拡張: `warnings: [{element, kind: "deprecated", ...}]`)
- 警告の**表示 (stderr 等) と文言はレンダラの関心** — DR-053 の「素材はフィールド、文言はレンダラ」と同じ分離
- alias 要素 (DR-057) に付いた deprecated は**その入口限定**。「use <canonical の入口> instead」の canonical は alias の指す先から自動導出できる (レンダラの素材)
- 値は **v1 では bool のみ**。代替の明示 (`deprecated: "<message>"` 等の string 拡張) は必要になったら検討する — alias 経由なら自動導出で足りるため
- filter の warn (DR-021 — パース中の解釈警告) と deprecated の警告 (パース成功後の利用推奨警告) は**別層**であり、混ぜない

## 採用しなかった案

### hidden の help 除外と補完除外を別フィールドに分ける

「表示層から隠す」という単一の意図で足りる。分けたい要件が出たら方言 / レンダラ設定で。

### deprecated 警告の stderr 直書き

出力先・文言が AST 仕様に入り、レンダラ差し替えと衝突する。構造 (warnings) と表示の分離を維持。

### v1 から deprecated: string (代替メッセージ)

alias の自動導出で主要ユースケースが足り、bool で始めて拡張余地を残す方が語彙が小さい。

## 関連

- DR-016 (ParserContext — warnings リストの拡張)
- DR-056 (参照 — hidden / deprecated は help / completion installer が読む語彙)
- DR-057 (alias — 入口限定 deprecated、canonical 自動導出)
- DR-053 (素材と文言の分離 — 同じ流儀)
- DR-021 (filter warn — 別層の明示)
- findings `2026-06-29-ast-missing-pieces.md` F-011 (解消)
