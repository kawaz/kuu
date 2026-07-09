# DR-079: filter 座席の完全格子化とリネームサイクル

pre_filters / filters / post_filters の命名が誤読を誘発していた問題を、kawaz との議論で
構造欠陥として特定・裁定し、spec と kuu.mbt 両リポへ追従した記録。

## 発端: pre/post アンカー非対称という違和感

kawaz「pre_filters と post_filters があるのに中間層だけ無印の `filters` で、意味が曖昧すぎて
誤読が多発する」という指摘 (2026-07-10 チャット議論) から出発し、意味整理を進めると
命名以前の構造欠陥が 2 つ見つかった:

1. **`filters` の二重役**: registry 名 (純関数語彙プール `<filters>`) と wire フィールド名
   (piece 単位 T→T 座席) が同語で、「filters を通る」が registry 適用一般とも特定座席とも読めた
2. **pre/post のアンカー非対称**: `pre_filters` の pre は **parse 基準**、`post_filters` の
   post は **accumulator 基準**。対に見える名前が別の軸を指し、parse 基準で対称に読む誤読
   (DESIGN §6.2 が per-piece T→T に post_filters と表記した事故) を構造的に誘発していた

さらに座席格子自体が不完全だった: 分割前 (cell 生文字列全体への string→string) の座席が
存在せず、multiple 無し要素の「長さ 1 縮退」で `pre_filters` が事実上それを兼ねていたため
欠落が見えなかった。

## DR-079 裁定 (kawaz、2026-07-10)

値の一生に沿う変換器 (separator 分割 / type.parse / accumulator) の間に、作用対象 artifact
でアンカーした 4 座席の完全格子を裁定:

| 座席 | 作用対象 | 型 | 単位 |
|---|---|---|---|
| A `raw_filters` | 分割前の生文字列 | string → string | cell |
| B `piece_filters` | 分割後の piece | string → string | piece |
| C `value_filters` | parse 済みの値 | T → T | piece |
| D `cell_filters` | 累積後のセル値 | Acc → Acc | cell |

- `pre_filters → piece_filters` / `filters → value_filters` / `post_filters → cell_filters`
- A (`raw_filters`) は名前を予約するのみで配線しない (実需が無い、需要が出た時点で本格子に追加)
- registry 名 `filters` は語彙プール専用に純化 (wire フィールドとしては消滅)
- 互換 alias は置かない (v1 前、MDR-001)
- 採用しなかった案 (`typed_filters` / `accum_filters` / アンカー全明示 / post だけ再アンカー) は
  DR-079 本文の「採用しなかった案」節に判断根拠あり

## 副産物: merge 機能の設計を issue に起票

同じ議論の流れでリスト merge 構文 (`app --fields -ip,-ua,@,duration,ip` のような piece レベル
add/remove/splice) の設計判断も裁定され、DR-079 本体ではなく別 issue
`docs/issue/2026-07-10-list-merge-piece-op-vocabulary.md` に記録した:

- piece は op 付き artifact に持ち上がる (`-x` = remove / `@` = splice / 素の piece = add)
- `@` はラダー下位席の勝者を参照する遅延合成 — DR-077「old は CLI 席内、ラダーは選択であって
  合成ではない」への明示的で最小の例外
- `unset` は「f = identity」の縮退形という統一が成立 (unset = ラダー開放 / merge = 変換して通す)
- opt-in 宣言は設けない (前置構造で option 誤認の心配が無い、kawaz 判断)
- エスケープ規約 (literal "@"、負値との衝突等) は先送り

DR 起草は未着手 (issue は open、受け入れ条件に「DR として裁定・起草」を含む)。

## spec 追従 (commit 656787cb)

fixtures 14 ファイル (wire フィールド 3 種 + why 文の語彙) と schema (プロパティ名 3 種 +
description、`cell_filters` に「累積後 (accumulator 後) の Acc→Acc チェイン」を明記) を
piece_filters/value_filters/cell_filters に追従。**ディレクトリ名・ファイル名も新語彙へ**
(`fixtures/pre-filters/` → `fixtures/piece-filters/`、`post-filter-{reject,range}.json` →
`cell-filter-*.json`、クロス参照パスも追従) — worker 側では「definition 内の wire フィールド名」
という指示スコープの外と判断して保留していたが、命名の実質的な意味が変わった以上の不整合として
最終的にリネームに含めた。

DESIGN / PIPELINE / CONFORMANCE / LOWERING は全域追従。§6.2 pieceProcessor 図の相ラベル誤り
(per-piece T→T が `post_filters` と表記されていた事故) は `value_filters` へ修正し、issue
`design-6-2-piece-post-label-collision` はこのリネームで解消 (resolved、archive 済み)。

**監査での訂正**: DESIGN §14.3 の DR-050 由来「非 string (number/bool) で型一致 → post_filters
のみ」という記述を、worker は素直に `value_filters` 単独と読んで置換した。しかし DR-050 §4 の
理由付け (「pre_filters/parse は String→型の関数なので、既に型を持つ値には適用対象が無い —
スキップは特別規則ではなく型の帰結」) を辿ると、スキップされるのは **string 域** (piece_filters
と parse) であって、通るのは **T 域の座席 2 つ** (`value_filters` と、累積後の `cell_filters`)
の両方が正しい。「post_filters のみ」の post が指していたのは単一座席ではなく「parse 後の T 域
全体」だった。DESIGN §14.3 を「T 域の座席のみ (value_filters / 累積後の cell_filters — string
域の piece_filters / parse は型の帰結でスキップ)」に確定して修正した。

過去 DR (DR-009〜078) と journal は判断記録・歴史記録として不変 (INDEX のみ注記)。

## kuu.mbt 追従 (commit ff60525a)

Entity / ElemDef / LongEntry / ShortEntry の構造体フィールド・decoder wire key・テスト名を
新語彙 3 種へ (`apply_pre_filters` → `apply_piece_filters` 等)。conformance
decoded=150 / ran_cases=382 / skipped=0 / mismatches=0、moon test 167 本全 pass。

- `apply_entity_filters` は value/cell 両座席を適用する複合関数のため、関数名自体は registry 語の
  現状名を維持 (DR-079 §4 の「registry 名 filters は語彙プールへ純化」と、複合適用関数の命名は
  別軸)
- `NoDashStr` の "pre_filter" 言及 (DR-037 の matcher 層構造ゲート、filter chain とは別概念) は
  DR 引用付きのコメントとして残置 — 同じ字面でも指す対象が違う既存コードなので機械的リネーム対象外

## ハマり所

1. **`replace_all: true` の部分文字列衝突事故**: `multiple-parse/filters-cell-ops.json` と
   `filters-each.json` で裸の `"filters"` を一括置換した際、`pre_filters` / `post_filters` の
   部分文字列 "filters" にも誤ってマッチし、`pre_value_filters` / `post_value_filters` という
   存在しないフィールド名、issue slug `accum-filters-non-set-op-semantics`、ファイル名言及
   `filters-each.json` まで書き換わった。全て検出して個別 Edit で修正。**リネーム系で置換前後の
   語が互いの部分文字列関係にある場合、`replace_all` は使わず個別 Edit で当てる**のが教訓
   (`piece_filters`/`value_filters`/`cell_filters` の 3 語は幸い互いに部分文字列関係を持たないが、
   置換元の `pre_filters`/`filters`/`post_filters` は `filters` が他 2 語の部分文字列になっていた)
2. **`moon ide rename` はデフォルトがプレビュー出力のみ**: `--apply` を付けないと書き換えが
   反映されない。さらに kuu.mbt 側の関数パラメータリネームで、無関係な別関数の定義パラメータまで
   誤爆した事故が発生 — `--apply` 実行後は毎回 `jj diff` / `git diff` で意図した範囲だけが
   変わったことを確認するのが必須。`moonbit-tips` rule (claude-rules-personal) に反映済み

## 関連

- DR-079 (`docs/decisions/DR-079-filter-seat-lattice-and-artifact-anchored-names.md`)
- DR-050 §4 (config 値の型一致スキップの理由付け、本サイクルの監査訂正の一次資料)
- issue `list-merge-piece-op-vocabulary` (open)
- issue `design-6-2-piece-post-label-collision` (resolved、archive 済み)
