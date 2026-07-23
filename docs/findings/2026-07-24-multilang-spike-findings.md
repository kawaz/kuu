# 多言語スパイク統合 findings (Rust / TypeScript / MoonBit phantom)

spec + fixture だけを一次資料として他言語で kuu を再実装するスパイク 3 本の統合報告。
出所ラベル: **[rust]** = Rust スパイク (codex-sol)、**[ts]** = TypeScript スパイク (opus47)、
**[mbt-phantom]** = MoonBit generative brand 実機調査 (codex-terra, moonbit 0.1.20260709)。

## 1. 総括 — spec-as-core の初実証

- **2 言語で合計 93/93 green、参照実装 (kuu.mbt) 未参照**。
  - [rust] 52/52 (matcher-readings 12 + value-sources 3 を含む)
  - [ts] 41/41 (unset-ladder / default-source-model は S4 理由でスコープ外)
- MoonBit 固有の leakage で「実装不能」になった箇所は 0 件 [rust]。
  spec + fixture が独立実装の一次資料として成立することの初実証。
- 同時に、以下の改善素材が得られた (§2)。最重要は S4 (variant DSL の op トークン
  綴りが仮置きのまま) で、これは v1 前必須。

## 2. spec 改善素材 (優先度順)

### 2.1 S4: variant DSL の op トークン綴りの確定 [ts] — v1 前必須

- fixture の variant DSL が使う op トークン (`no:unset` 等) の綴りが「D9 と要調整」の
  仮置きであることを fixture 自身が自白している。EBNF が無く、他実装が DSL パーサを
  仕様から書けない。
- 対処: 綴りを裁定で確定し、DSL の EBNF を spec に置く。

### 2.2 fixture why の実装内部語彙漏れ [ts]

- S1–S3: fixture の why 記述に kuu.mbt の内部語彙が漏れており、他実装からの
  一次資料性を損なう。観測された語彙:
  - `Matcher::ShortCombine`
  - `walk_short`
  - `node.mbt`
  - 「pair-key 化」
  - 「分岐数 3」の enumerate 視点
- 対処: DESIGN / LOWERING に対応する抽象語彙 (概念名) を整備し、fixture why は
  そこへの link に置き換える。

### 2.3 short_combine の cluster 成立条件の明文化 [rust]

- cluster 成立条件 (全参加 entry の conjunction) が DESIGN §7.2 に明文が無く、
  fixture からの推論頼みになっている。

### 2.4 先食い precise 述語の algorithmic 節 [ts]

- T7: 先食いの precise 述語 (DR-097) の algorithmic な書き下しが薄い。
  簡略実装 (option 分岐が出た token で positional 抑制) で fixture は通ったが、
  複雑な constraint 合成で実装間差が出る余地が残る。

### 2.5 A 系の穴 (エラー・provenance 周辺の未規定) [ts]

- A1: failure errors の「全保持」で、同一 4-tuple の dedupe 有無が未明示。
- A2: 未発火 flag の sources 語彙が未定義。
- A3: 予約語彙 (`sources` / `warnings` / `effects` / `result`) と entity name の
  衝突禁則が無い。
- A5: 「値スロット内では先食いが及ばない」一般則が DESIGN に無い
  (fixture からのリバースで判明)。

### 2.6 ambiguous ビュー規則の DESIGN 集約 [rust]

- ambiguous のビュー規則が DESIGN と CONFORMANCE に分散していて突き合わせが必要。

### 2.7 §11.4 sources 射影の明文化 [rust]

- default op の sources 射影 (値 provenance と操作 provenance の分離) が
  DESIGN §11.4 単独では読み取りにくい。

## 3. 言語別所見

### wire union の decode 性

- wire `long` の bool / array / colon-string union は serde で型付き decode
  しにくい (DESIGN §7.1/§7.3) [rust]。
- wire node は `type` が値型名で、役割は配置で決まる → TS の discriminated union の
  判別子として使えない。Rust enum の優位も wire 面では発揮されない [ts] (T1)。
- 経路同一性が効果列 dedup の二段実装になる負担 (§15.1/15.2) [rust]。
- enum + exhaustive match / owned State clone による branch isolation は
  Rust では自然に書ける [rust]。

### number canonical と 2^53

- number canonical (1.0→1) は TS が最も自然に飲む = 規約が JSON 型モデルに
  寄っている [ts] (T2)。
- ただし 2^53 超は `JSON.parse` の silent precision loss があり、
  「TS が最も自然」は raw-preserving parser 無しでは担保されない [ts] (T3/E)。

### 比較器

- 比較器は outcome ごとに別規則が必要: reason optional / interpretations 順序
  非規範 / effects 順序規範 [rust]。

### provenance の言語別上限

- Rust: generative brand (`PhantomData<fn(&'brand()) -> &'brand()>`) で
  呼び出し単位の静的保証が可能。ただしプロセス内限定 [rust]。
- MoonBit: 呼び出し単位の generative brand は不可能 (rank-2 / existential 型が無く、
  `(Ast[_]) ->` は Partial type エラー。roadmap / RFC にも計画なし)。可能なのは
  package 単位まで — abstract type + 非公開 constructor で偽造防止はできるが、
  parse() 2 回の産物は同一 brand になる [mbt-phantom]。
- 帰結: AP2-Q4=b (契約ベース) が MoonBit の上限で裁定と整合。Rust 実装は
  言語側強化で静的保証に格上げ可能。

## 4. AP2-Q3 (拡張 ABI 設計) への入力

2 言語で書いて見えた「拡張が要る面 / 要らなかった面」:

- **拡張が要らなかった面**: パイプラインの意味論そのもの (matcher / 先食い /
  効果列 / 比較) は spec + fixture で 2 言語とも閉じた。ABI として言語間で
  合わせる必要があったのは wire 形と比較規則だけ。
- **拡張 (spec 側の追加規定) が要る面**:
  - wire union の decode 規則 — 型付き decode 前提の言語 (Rust/TS) が union を
    どう判別するかの規範 (§3 の T1/serde 所見)。
  - 数値表現の規範 — canonical 化と 2^53 超の raw 保持要件を実装要件として
    明文化しないと言語間で silent に割れる。
  - provenance 保証水準の宣言 — 静的保証 (Rust) / 契約ベース (MoonBit) の
    どちらでも conformant になる書き方 (AP2-Q4=b と接続)。

## 5. 対応の振り分け案

### 即修正 (裁定不要)

- §2.2 fixture why の実装語彙除去 + DESIGN/LOWERING の抽象語彙整備
- §2.3 short_combine 成立条件の §7.2 明文化 (現行 fixture の挙動を書くだけ)
- §2.6 ambiguous ビュー規則の DESIGN 集約
- §2.7 §11.4 sources 射影の説明補強
- §3 比較器の outcome 別規則を CONFORMANCE に明記

**5 件**

### Q 化候補 (裁定が要る)

- §2.1 S4: op トークン綴りの確定 + DSL EBNF (v1 前必須)
- §2.5 A1: errors dedupe の有無
- §2.5 A2: 未発火 flag の sources 語彙
- §2.5 A3: 予約語彙と entity name の衝突禁則

**4 件**

### issue 化 (後回し可)

- §2.4 先食い precise 述語の algorithmic 節 (現 fixture では差が出ていない)
- §2.5 A5: 値スロット内の先食い非適用の一般則明文化 (規定の置き場所検討込み)
- §4 の数値表現規範 / wire decode 規則 (AP2-Q3 の設計と一緒に扱うのが自然)

**3 件**
