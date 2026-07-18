# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み (裁定記録は findings 2 本と DR-112 が正本)。現在の裁定待ちは TRI-Q バッチ (API 公開面棚卸し、下記) + 帰宅後タスク 1 件 (下記 HOME-T1)。

## HOME-T1: RubyGems publish の 1Password 認証 (帰宅後、Touch ID が要る)

kuu 名前空間確保の RubyGems publish (`gem push kuu-0.0.1.gem`) が **1Password の認証ダイアログ (Touch ID) 待ち**で止まっている。雛形 (Ruby gem、kuu-cli delegate ラッパー) はビルド・動作検証済みで、コマンドも準備済み — 帰宅したら「rubygems ok」等で合図をください。統括が `op run` 透過で即実行します (値は context に載せない)。ついでに Hex.pm / NuGet の publish も同じ認証で続けて流します (Elixir 雛形は作成済み、NuGet 雛形 (C#) は publish 前に作成)。

## TRI-Q バッチ: API 公開面棚卸しの境界裁定 (kuu.mbt)

> 出所: kuu.mbt の docs/findings/2026-07-18-api-surface-triage-table.md。裁定済み (kawaz 2026-07-18): **TRI-Q1 = 分割案** (installer 以外の拡張面 (type/filter/値源/補完) を先に完成 — 逆依存は installer 契約 1 種だけと確認済み。carrier 12 型は engine 残置 + pub(all) 撤廃で凍結し、installer 契約の opaque 化は独立 issue へ)。**TRI-Q4 = a** (出力口を OutputView 1 構造体に束ねて唯一の出口に)。**TRI-Q8 = a + named bundle 構想** (組成は kuu 所有。ただし「未指定 = builtins 全部」の暗黙 fallback でも「明示 = 全量手動再定義」の崖でもなく、named bundle (`recommended` 相当の名前付き組成プリセット) を参照して差分だけ追加・オンオフできる組成 API にする — lint ツールの extends 慣習と同型。bundle 設計の詳細は組成 API の設計サイクルで)。残る裁定待ちは TRI-Q2 のみ (下記、kawaz の「エラー enum は descriptor 宣言すべき、横断 1 enum はアホ」の指摘はまさに TRI-Q2 = a の方向)。

## TRI-Q2: 型パーサの失敗契約 (ParseFail の閉じた列挙) の開放

### 背景説明

3rd party が独自型 (TypeExt) を作るとき、パース失敗の reason が engine の閉じた enum (ParseFail: not_a_number 等の builtin 語彙固定) でしか返せず、**自前の reason (例: "invalid_ipv6") を宣言できない**。descriptor の reasons 宣言 (DR-061、spec 側が正本) と非対称。

- **a. 開いた {reason, message} 契約 (TypeParseFail struct) へ変更 (推し)**: descriptor の reasons 宣言と対称になり 3rd party 型が自前 reason を出せる。全型住人の一斉追随が要る (段 3)
- b. ParseFail 維持 + Custom(reason, message) バリアント追加 (閉じた列挙の延命だが追随コスト小)
