# DR-066: 実行時エラーの reason コード層 — 機械可読な失敗理由と発生源宣言

> 由来: conformance fixture (DR-065) の failure 検証で、kind 3 値 (parse / filter / constraint) では「正しい理由で失敗したか」を判別しきれない (同 element・同 argv_pos・同 kind の別失敗モードを区別できない) 問題。DR-054 の definition-error が機械可読な細分 kind を持つのに実行時エラーが 3 値 + 自由文である非対称の解消。議論経緯は docs/issue/2026-07-04-phase1-serialization-design-agenda.md (C-3 派生)。

## 決定

### 1. errors に reason フィールドを追加 (DR-053 の構造拡張)

```
{element, argv_pos, kind, reason, message}
```

- **reason は機械可読な失敗理由の識別子** (snake_case 文字列)。kind (層の分類) と message (人間向け文言、レンダラの関心) の間に立つ仕様語彙
- 組み込みの発生源 (エンジン構造・canonical factory・組み込み filter・遅延述語) は **reason を必ず emit する**。拡張 (ユーザ filter 等) にも emit を推奨する (未 emit は許容 — その場合 fixture は kind までの検証になる)
- 文言は従来どおりレンダラの関心。**reason → 文言のマップがローカライゼーションの実装単位**になる (reason は仕様語彙なので locale 資産が実装間で共有可能)

### 2. 発生源は emit しうる reason を descriptor で宣言する (DR-061 の拡張)

descriptor (DR-061) に **`reasons`** (emit しうる reason 識別子の列挙) を追加する。installer / configurable factory / filter / 遅延述語評価器が各自宣言する。

- reason は**グローバル語彙で、排他所有ではない** (使用宣言)。同じ reason を複数の発生源が emit してよい (`missing_operand` は構造系のどこでも出る)
- 用途:
  - **テストケースの完備チェック**: 「定義に登場する全パーツの reasons の和」に対する fixture のカバー率を機械検査できる (lint / diagnose の関心)。仕様輪郭の網羅 (テスト = 真の仕様書) を機械化する
  - **逆方向の typo 検出**: fixture が期待する reason がどの宣言にも無い → unknown-vocab (DR-054) と同族の検出
  - **ローカライゼーションの完備**: reason → 文言マップの欠落検出

### 3. 組み込み reason の最小語彙 (v1)

| kind | reason | 意味 |
|---|---|---|
| parse | `missing_operand` | トークンが尽きて要素の消費要求が満たせない (構造的必須の不成立を含む) |
| parse | `unexpected_token` | 消費者の居ないトークンが残る (残余トークン) |
| parse | `not_a_number` | number / float の value_parser が構文不一致。int も number 字句で判定する (DR-075 §1) ため、number として全く読めない入力 (例 `"abc"`) は int でも本 reason に落ちる |
| parse | `not_an_integer` | int の value_parser が「number としては読めるが整数でない」入力 (例 "2.5") を弾く精密 reason。**`int_round=error` のときのみ emit** (DR-075) — 丸めモード (`floor` 等) では非整数値も丸めて成功するので emit しない。int は値空間判定なので `"3.0"`/`"1e3"` 等の整数値は全モードで受理 (本 reason に落ちない)。float は number と受理域同一 (DESIGN §3.3) のため専用 reason なし |
| constraint | `required_violated` | required の値充足 (DR-047) 失敗 |
| constraint | `requires_violated` | requires の目的語不足 |
| constraint | `exclusive_group_violated` | exclusive_group 内の committed 衝突 |
| constraint | `conflicts_with_violated` | conflicts_with の committed 衝突 |

constraint 系は **`<属性名>_violated`** で機械的に統一する (属性への遡及が名前だけで自明、L10n キーとしても一様)。

value_parser 系 (`not_a_number` / `not_an_integer`) の reason 語彙は本 v1 表で確定する。各 reason を canonical factory の descriptor `reasons` 宣言へ写像する作業 (DR-040 の canonical 語彙を config キーとともに descriptor へ実体化する Schema 実体化) は DR-068 のライフサイクルに従い後続フェーズで行う。filter 系 reason は各 filter の descriptor 宣言 (例: in_range が `too_small` / `too_large`)。

### 4. fixture では reason は optional 検証 (DR-065 / CONFORMANCE への反映)

fixture の errors 期待値に reason を書けば検証し、書かなければ kind までの検証。段階導入を可能にする (既存 fixture を壊さない)。

## 採用しなかった案

### message の部分一致検証

文言拘束のグラデーションで曖昧になるだけ。reason (仕様語彙) と message (レンダラ) の分離が明確。

### reason の排他所有 (発生源ごとの prefix 名前空間)

`filter:in_range:too_large` のような prefix は読み書きが重く、reason は分類語彙であって所有物ではない。衝突が問題になるのは意味の異なる同名 reason だけで、それは語彙追加時のレビュー (descriptor 宣言が可視化する) で防ぐ。

### v1 で全 reason を閉じた列挙にする

filter / 拡張型由来の reason は open set。組み込み最小語彙 + descriptor 宣言 (開いた集合 + 宣言、DR-061 の流儀) で管理する。

## 射程外

- reason → 文言マップの標準フォーマット (レンダラ / DX 層の関心。仕様は reason 語彙まで)
- canonical factory / 組み込み filter の reason 全列挙 (Schema 実体化と同時)
- 完備チェックツールの実装 (lint / diagnose の実装課題)

## 関連

- DR-053 (errors 構造 — 本 DR が reason を追加)
- DR-075 (int の値空間判定 + int_round — `not_an_integer` は int_round=error のときのみ emit、新 reason 不要)
- DR-054 (definition-error の細分 kind — 対称性の先行例)
- DR-061 (descriptor — reasons は 4 つ目の宣言軸)
- DR-065 / docs/CONFORMANCE.md (fixture の optional 検証)
- DR-047 (遅延述語 — constraint 系 reason の意味論)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (議論経緯)
