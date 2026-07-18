# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み (裁定記録は findings 2 本と DR-112 が正本)。現在の裁定待ちは TRI-Q バッチ (API 公開面棚卸し、下記)。

## TRI-Q バッチ: API 公開面棚卸しの境界裁定 (kuu.mbt)

> 出所: kuu.mbt の docs/findings/2026-07-18-api-surface-triage-table.md (272 identifier 全数分類、D=47 件)。発端はゼロ知識コールドレビュー + kawaz 指摘「実装を伴わないインターフェースの分類がまだまだ甘い、pub に出過ぎ」。段 0 (dead 削除) と段 1 (filter 契約の engine 移動 + 組成是正) は裁定不要で先行着手する — 以下は残る境界ケースのうち **kawaz 裁定が要る 4 問** (他 5 問 (TRI-Q3/Q5/Q6/Q7/Q9) は分類表の推しが保守的 (本サイクル最小 + 後続 issue 分離) で導出可能と統括判断し、そのまま採用する)。

## TRI-Q1: installer 語彙 carrier 12 型 (ElemDef/Definition 等) の移動方式

### 背景説明

ElemDef (55 フィールドの要素定義) / Definition / OwnedDecl 等の 12 型は「installer が読む wire 断面の運搬役」で、DR-110 の理想では builtins 側の語彙 (engine は語彙を知らない) のはず。しかし現状は **InstallerExt::decode 等の契約シグネチャ自体がこれらの型を参照**しており、単純に builtins へ動かすと依存方向 (builtins→engine の一方向) が壊れる。

- a. 契約を opaque 化して carrier を builtins へ (DR-110 に最忠実だが install 契約の再設計 = 本サイクル最大工数)
- **b. 今サイクルは engine 残置 + pub(all) 撤廃 (外部構築不可化) に留め、opaque 化 + builtins 移動は open node 化と同じ後続再設計 issue へ (推し)**: a は open node 化と同じ再設計群に属し、単独で急ぐと手戻る。b 採用時は「規範完全準拠ではない中間形」の注記を DR-110 に追記
- c. 現状維持 — 不採用 (擁護しない方針)

## TRI-Q2: 型パーサの失敗契約 (ParseFail の閉じた列挙) の開放

### 背景説明

3rd party が独自型 (TypeExt) を作るとき、パース失敗の reason が engine の閉じた enum (ParseFail: not_a_number 等の builtin 語彙固定) でしか返せず、**自前の reason (例: "invalid_ipv6") を宣言できない**。descriptor の reasons 宣言 (DR-061、spec 側が正本) と非対称。

- **a. 開いた {reason, message} 契約 (TypeParseFail struct) へ変更 (推し)**: descriptor の reasons 宣言と対称になり 3rd party 型が自前 reason を出せる。全型住人の一斉追随が要る (段 3)
- b. ParseFail 維持 + Custom(reason, message) バリアント追加 (閉じた列挙の延命だが追随コスト小)

## TRI-Q4: kuu 玄関の結果径路の一本化

### 背景説明

結果の取り出しに result / sources / build_result / output (OutputView) の複数径路があり、コールドレビュー「どれが正道か型から読めない」の指摘対象。さらに kuu-cli の Ambiguous 描画が玄関を通らず内部部品 (build_result / accum_cells / export_map / ast.root 直触り) を組んでいる。issue 2026-07-17-interpretation-view-filter-front-door と同件。

- **a. OutputView (output) を唯一の結果径路にし、Ambiguous 解釈ごとの描画も玄関 API (output_of_interpretation 相当) を新設して部品直呼びを解消 → 内部 6 identifier を降格、AtomicAST フィールド opaque 化 (推し)**: DR-110 §5「利用者が呼ぶのは玄関だけ」の残債解消。kuu-cli 追随が必要 (段 2)
- b. 現 3 径路維持 + doc で正道明示

## TRI-Q8: 全部入り組成表の暗黙所有の是正

### 背景説明

builtins の lower_definition が「引数省略時は builtins が全部入り registry を自動生成」する default を持つ。DR-110 §2-3 は「組成 (どの住人を入れるか) は assembly (kuu) の所有」— 全部入りの既定は組成表の複製で違反。呼び出し側は kuu と wbtest のみで追随コストが小さいことは確認済み。

- **a. default を外して必須引数化、組成は kuu の canonical_registry だけが持つ (推し)**
- b. default 維持 (subset assembly は明示引数で可能なので実害小、と擁護)

