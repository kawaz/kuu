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

> **明確化 (統括検証 2026-07-15、codex レビュー #6 の反映): 警告構造の `element` は canonical セル名 (= 代替すべき実体) を指す — 発火した deprecated 入口の要素名ではない。** 本 DR 原文の `warnings: [{element, kind: "deprecated", ...}]` は element の指示対象を明示していなかったが、警告の第一の用途が「use <canonical の入口> instead」の導出素材 (§2 の alias 節) である以上、レンダラが直接必要とするのは代替先 = canonical であり、fixture (`fixtures/alias-parse/deprecated.json` の short 入口版・`long-deprecated.json` の long 入口版) もこの形で pin 済み。**どの入口が発火したか**の特定は ParserContext の selected_names (DR-016) / 内部 id (DR-046 §4) の関心で、warnings には持たせない (エラー構造の element / path 分離 (DR-066 §4) と同じ「自分 + 帰属先」の関心分離)。

> **明確化 (DEP-Q1=a、kawaz 裁定 2026-07-17): warning の cardinality は element 単位で畳む (重複排除)。** 同一 deprecated 入口 (または同一 canonical に帰属する複数の deprecated 入口) を 1 parse 内で複数回起動しても、warnings には同一 `{element, kind}` の entry を 1 件だけ積む。warnings の第一用途は「use <canonical> instead」の導出素材 (§2) であり、発火回数はこの素材に不要 — 回数を必要とするレンダラが現れた場合、それは繰り返しエントリではなく別素材で表現すべき関心。CONFORMANCE §3 の「warnings は集合比較 (element の組)」とも整合する (集合では重複を表現できないため、積む側の規範も畳みで一意になる)。表示層での集約 (「3 回使用」等) はレンダラの関心で本 DR の対象外 (DR-053 の素材/文言分離)。fixture: `fixtures/alias-parse/deprecated.json` の複数回起動 case で pin。

> **明確化 (DEP-Q2=a、kawaz 裁定 2026-07-17): failure outcome に warnings は出さない。** deprecated 警告の層定義は「パース成功後の利用推奨」(§2 が filter warn (DR-021) と別層化した根拠そのもの) であり、失敗した起動に乗り換え推奨を出しても行為として成立しない (エラー修正が先)。§2 の「起動されたら積む」は ParserContext への内部蓄積の記述であって、wire の failure 面への露出を含意しない — 内部蓄積自体は実装の自由 (kawaz 裁定時の言語化: 「内部でワーニングを積むのは構わないが、最終的にエラーなら積んだワーニングは捨てる。パース実行時の話」)。failure の wire 語彙 (CONFORMANCE §2) に warnings は存在せず、本裁定はこの現状を規範として確定する。**lint / 診断モード (DR-047 §7 系譜) は別層** — 診断が目的の実行では error パターンも warning も全部出すのが正しく、本裁定 (捨てる) はパース実行の報告面に限る。裁定質問 (DEP-Q2) は parse 段失敗 (値不足・値不正) を対象としたが、規範は outcome が failure になるすべての経路に適用される — parse 成功後に resolve 相 (値源ラダー) で転落した場合も、wire 語彙に warnings が無い以上 failure 面に warnings を載せない (deprecated 入口の起動自体は成立していても、報告面の規範は outcome 単位)。fixture: `fixtures/alias-parse/deprecated.json` の失敗 case で pin。

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
