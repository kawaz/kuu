# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺GEN-Q1〜Q6: DR-116 補完生成器の実装設計 (正本: docs/findings/2026-07-22-completion-generator-plan.md)

- **👺GEN-Q1: アーキテクチャ** — (a 推し) ブリッジ型一択: 生成スクリプトは薄い橋で、補完時に kuu バイナリを呼ぶ (cobra 方式)。静的展開型は生存経路計算・after 整合・動的 completer が script へ展開不能で劣化版にしかならない / (b) 静的展開 / (c) 混成 — findings §1
- **👺GEN-Q2: v1 対象シェル** — (a 推し) zsh + bash + fish の 3 つ (能力 3 象限 = リッチ/中間/順序不可 を初期に踏み、翻訳層の設計が最初から鍛えられる) / (b) zsh のみ先行 — §2.3
- **👺GEN-Q3: 生成コマンド形** — (a 推し) `kuu completion generate <def.json> --shell <s>` (kuu-cli 既存流儀と一貫) / (b) cobra 風 `kuu completion <shell>` — §2.1
- **👺GEN-Q4: 補完時 query の契約** — (a 推し) `kuu completion query --cword N -- words...` を新設 (既存 `complete` = 素材口とは別の policy 適用済み envelope 口。raw argv 直渡しで shell に JSON quoting を組ませない) / (b) 既存 complete を拡張 — §3
- **👺GEN-Q5: 未知の custom completer 名** — (a 推し) builtin マップのみ対応、未知名は候補なし + docs 告知 (files への fallback は型違い候補で無より悪い) / (b) files fallback — §3.5
- **👺GEN-Q6: 生成器の住処** — (a 推し) kuu-cli lib (DR-115 renderer と同座席、spec/kuu.mbt 増分ゼロを突き合わせ表で裏取り済み) / (b) kuu.mbt に支援 API — §5

**回答形式**: 「GEN 全部推し通り」/ 個別指定。裁定後 kuu-cli 実装 (envelope の正本化は kuu-cli docs 側)。
