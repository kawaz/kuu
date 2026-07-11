# DR-089 (type 省略 = none) から DR-090/091 起草・裁定バッチ消化までのサイクル

DR-089 (type 省略時の値空間) の裁定と kuu.mbt 実装完遂を起点に、Q1-Q6 の裁定バッチ、
DR-090 (dd の一般化) と DR-091 (bare key=value の段階論) の起草、AskUserQuestion 運用の
パーソナルルール化までを通したサイクルの記録。

## DR-089 (type 省略 = none)

型省略時の値空間の扱いについて kawaz 裁定: 「ないものに値型を当てるのは手抜き」「値空間なしでも
消費は構造次第 (shell の `:` = none + repeat + Accept(1))」。**値空間と消費は直交する軸**であり、
値空間が無い (none) ことと消費の形 (repeat / Accept(1) 等) は独立に決まる。

当初 team-lead (私) が「値空間なし = 消費も 0」と勝手に結び付けて起草したところ、この誤りを
kawaz に訂正された。さらに「観測したければ flag に」という代替案も短慮だったとして撤回した —
発火の観測は ParserContext / explains 層の責務であって、型を追加することでねじ込む話ではない。

kuu.mbt 実装まで完遂した。effects の非掲載 (none 型のセルは result の effects 一覧に載せない)
は dd の先行例と DR-089 §3 から裁定した。

commit: kuu.mbt `ed4dee87`。conformance: decoded=182 / ran_cases=472 / skipped=0 /
mismatches=0。moon test 227 本。

## 裁定バッチ (Q1-Q6)

- **Q1**: 連続 optional の解釈は ambiguous 一択。引数設計が悪い場合の救済は行わない
- **Q2**: scalar positional の default は DR-088 から普通に書ける。issue の前提自体が
  (DR-088 制定前の状態を前提にしていて) 古かったと判明。検証 follow-up 進行中
- **Q5**: negatable は不採用
- **Q6**: `ref` は狭い意味に確定。DR-007 の例を改訂し、別入口が要る場合は `alias` を使う

## DR-090 (dd の一般化)

kawaz 提案: トリガを regex 化し、自己保持 splice を組み合わせることで xargs / ssh / docker の
ような「末尾の raw pass-through」を一般化できる。既存の pattern dd (固定トリガ) は既知の読みに
常に負ける最後の受け皿として残す。

「方言が関係するほど複雑な条件は来ない」という判断で regex を採用した (= 過剰な表現力を持つ
汎用エンジンではなく、想定される用途の範囲で足りる regex に留めるのが正しい設計、という判断)。

## DR-091 (bare key=value の段階論)

kawaz 提案、3 段階で導入する:

- **§1 素通し**: `regex_match` で表現。今日書ける
- **§2 kv_map accumulator**: bare `key=value` トークンを kv map として蓄積
- **§3 `long_prefix:""` + `require_equal_separator`**: 空 prefix の long option として成立させる
  条件は `require_equal_separator` (= `=` が必須であること) — 空 prefix を許すと `--foo` と
  `foo=bar` の区別が付かなくなるため、`=` 必須化が空 prefix 成立の前提条件になる

旧 hack (bare key=value を暫定的に通していた実装) は未定義動作として一掃対象になった。

## 運用: AskUserQuestion の考察系使用を禁止

AskUserQuestion を「考察を深めるための問いかけ」に使う運用を禁止するパーソナルルール化を行った。
回答 UX 上の問題点 4 点が理由 (選択肢が思考の幅を狭める / 深い議論には往復コストが合わない等)。

fixture の present フィールド記述漏れが本サイクルまでの累計で 6 例 (sources 側含む) に達した。
再発防止として、委譲プロンプトに定型チェック項目として組み込む方針にした。

## issue 消化

本セッション累計: spec 11 close + kuu.mbt 12 close。新規 follow-up 4 件
(`dr-088-positional-verification` / `dr-090-impl` / `dr-091-impl`、残る1件は起票と同時に close 済み)。

## commit 系譜

spec: DR-089 = `94f208e7` / DR-090 = `e7360980` / DR-091 = `a438791f` (sign-on-push 後の
実 hash は `jj log` を参照)。kuu.mbt: `ed4dee87`。

## 関連

- DR-089 (`docs/decisions/DR-089-type-omission-none.md`、type 省略 = none) / DR-090
  (`docs/decisions/DR-090-dd-generalization.md`、dd の一般化) / DR-091
  (`docs/decisions/DR-091-bare-key-value-staged-plan.md`、bare key=value 段階論)
- DR-007 (ref の狭義確定、Q6 で改訂) / DR-088 (Q2 の前提更新元)
- issue `dr-088-positional-verification` / `dr-090-impl` / `dr-091-impl` (いずれも open、
  次サイクルの実装対象)
- 前回 journal: `2026-07-11-dr087-088-lazy-default-and-declared-source.md`
