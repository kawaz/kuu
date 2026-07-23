# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺ABI-Q1: preset の positional 入口を許すか (DR-117 レビューで浮上)

**背景**: `completion_script` preset でサブコマンド形 (`app completion zsh`) を直接書くには positional 入口が要る。DR-113 §2 の help preset 群は入口を「long / short / env」とだけ列挙し positional に触れていない。DR-117 起草者は「preset type は値空間と発火意味論を定めるもので配置面を制限しない (入口列挙は例示)」の全 preset 一般解釈として positional 許可を規範化したが、レビューが「GEN-Q3x 付帯論点として保留されていた裁定事項の独断消化 + DR-113 実質改訂 + DR-064 (dd 配置不問) の越権拡張」と指摘。

**選択肢**:
- **(a) 全 preset で positional 入口許可** (起草者案 + 統括推し): completion だけの特例を作らず一般解釈で確定。「入口の形は定義者の自由」原則と一貫、配置制限リストという管理物も生まれない。波及 = DR-113 §2 と DR-064 への note 追記。悪い面 = help preset の positional 形 (引数位置 help) も合法になるが valid で無害
- (b) completion_script のみ許可: 特例が残り、preset ごとの配置可否リストが発生
- (c) positional 入口は不許可: サブコマンド形は or 合成等の間接表現のみ

**参照**: docs/decisions/DR-117-completion-generator-abi.md §2.3 (未 push、working copy)、docs/findings/2026-07-22-completion-generator-plan.md §2.2 末尾 (保留の記録)、DR-113 §2、DR-064

**回答形式**: `ABI-Q1=a` 等。裁定後、レビュー残指摘 (裁定不要の修正 8 件) と一括で DR-117 修正 → land。
