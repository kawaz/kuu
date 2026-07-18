# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み (裁定記録は findings 2 本と DR-112 が正本)。TRI-Q バッチも全問裁定済み (Q1=分割案 / Q2=a 開いた失敗契約 / Q4=a OutputView 一本化 / Q8=a+named bundle。記録は kuu.mbt の分類表 findings と issue 群)。現在の待ちは帰宅後タスク 1 件 (下記 HOME-T1) のみ。

## HOME-T1: RubyGems publish の 1Password 認証 (帰宅後、Touch ID が要る)

kuu 名前空間確保の RubyGems publish (`gem push kuu-0.0.1.gem`) が **1Password の認証ダイアログ (Touch ID) 待ち**で止まっている。雛形 (Ruby gem、kuu-cli delegate ラッパー) はビルド・動作検証済みで、コマンドも準備済み — 帰宅したら「rubygems ok」等で合図をください。統括が `op run` 透過で即実行します (値は context に載せない)。ついでに Hex.pm / NuGet の publish も同じ認証で続けて流します (Elixir 雛形は作成済み、NuGet 雛形 (C#) は publish 前に作成)。

