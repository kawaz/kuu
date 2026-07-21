# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺GAP-Q1: DR gap 3 論点の追認規範化 (実装・fixture が一意に決めた形の DR-113 追記)

open issue 3 件の調査結果、以下は実装 + fixture + schema が既に一意に決めており、DR-113 への追記 (追認規範化) のみで解消できる。**まとめて承認可否の 1 Q**:

- **(i) help_category の value_structure 形** (issue dr113-help-category-value-structure): model 射影 = `or[single{bool}, single{value_name:"CATEGORY" 既定, string}]` (kuu.mbt help.mbt:448-468 + fixture help-types-and-default-fn.json:26-29 が同形)。DR-113 §2.3 に 5-8 行追記。string 枝の value_name 既定 "CATEGORY" も preset canonical として明記
- **(ii) values_enum の model 射影** (issue help-model-values-enum 前半): enum 値制約は `single.values_enum` として model に載る (DR-113 の model 例文 L165-199 に既出、schema/実装済み)。§4.1 の single 定義に明記。issue の「lowering で出自が失われる」懸念は誤解 — help model は lowering 経由でなく定義から直接組むため保存される
- **(iii) per-field 配列順** (同 issue 後半): spellings / alias_spellings / types / used_as は宣言出現順 (positionals の「定義順を保存」と同じ既定)。§4.4 に 1 段落追記

**推し = 承認** (3 点とも波及なし、DR 追記 10-15 行のみ)。回答: `GAP-Q1=承認` / 個別除外指定。

## 👺GAP-Q2: origin の alias 形を削除するか (本質的分岐)

**背景** (issue dr113-alias-origin-schema-mismatch): DR-113 §4.4「alias は canonical entry に併記し、独立一覧しない」により、origin enum の `{"kind":"alias","of":...}` 形の出現点が存在しない。schema (fixture.schema.json:405-410) と DR-113 §4.3 の 4 形列挙と kuu.mbt の HelpOrigin.Alias variant (生成箇所ゼロの dead carrier) に残存。

- **候補 a (推し) = 削除**: schema 6 行 + DR-113 §4.3 の 1 形 + kuu.mbt variant を削除。§4.4 の設計骨格と完全整合、dead carrier 除去。fixture 影響なし (使用ゼロ)
- **候補 b = 独立 entry 用法の規定**: §4.4 の禁止を緩和し名前付き alias を独立 entry 化 — 既存設計の反転、大きな変更で積極理由なし
- **候補 c = 現状放置**: dead が残る

回答: `GAP-Q2=a` 等。

## 👺GAP-Q3: wire.schema の help_epilog description から「葉合法」発明を削除

**背景** (issue wire-schema-help-epilog-scope-drift): wire.schema.json:225-227 の help_epilog description に「葉要素に付いても合法だが v1 model に座席なし (lint warn)」が実在するが、DR-113 §7.1 は「選択スコープ末尾素材」としか規定せず、葉合法は P1 時の発明。P2 で DESIGN/REFERENCE は scope 限定へ修正済み、schema description だけ残存。

- **候補 a (推し) = description から「葉合法」削除、scope 要素限定に統一** (docs と揃える)
- **候補 b = DR-113 §7.1 に葉合法性を追記して規範化** (発明を昇格)

回答: `GAP-Q3=a` 等。

**GAP-Q1〜Q3 裁定後**: DR-113 追記 + schema/kuu.mbt 修正を worker 委譲 (lockstep 小窓)。issue 5 (apply 位相差注記) も DR-113 を触るこの波及に同乗させて 5 件全消化。
