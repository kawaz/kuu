# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 HIP-META-Q13: category_mode "default" と "all" の model 差の確定

**背景**: P2 help fixture 書き直しで reviewer が検出。DR-113 §1 (L35-37) は 3 値をこう規定:
- `"default"`: 「renderer が採る通常の category 表示用 model」 — **具体的な entry 集合が曖昧**
- `"all"`: 「category で絞らず全 entry と全グループ宣言 entry を返す」 — 絞りなしが明文
- `{"named": name}`: 「help_group_name が name の entry と当該グループ宣言 entry に絞る」 — 絞りが明文

named の絞りは明確なので fixture へ反映済み方向。残る曖昧 = **default と all の model 素材の差**。L115 の「renderer は同じ category_mode に従い…policy を選ぶ」の文が「model 素材は同じで renderer policy だけ違う」とも読め、L35-37 の「all は絞らず返す (= default は何かが違う)」とも緊張する。

**論点**: `category_mode: "default"` の help_query が返す model は `"all"` と何が違うか?

- **候補 a** (統括推し): default = all と**同一の entry 集合** (全 entry + 全グループ宣言 entry)。差は renderer policy への指示だけ (L115 準拠読み)。→ DR-113 L35-37 の "all" 説明文を「default との差は renderer policy 指示」へ明確化
- **候補 b**: default は **hidden entry を落とす** (hidden は help_show_hidden 軸/renderer policy の管轄なので、これは §4.4「hidden は model に残す」と衝突しやすい)
- **候補 c**: default は **グループ宣言 entry を落とす** (グループ構造は category 表示時のみ必要、通常表示は flat 一覧) → all との差が「グループ宣言 entry の有無」になる
- **統括推し理由**: §4.4「hidden は model に残す。除外はレンダラ policy」の設計思想 (model は素材全部、表示選択は renderer) と一貫。b は §4.4 と正面衝突、c はグループ表示を default で組めなくなり renderer の自由を奪う

**参照**: `docs/decisions/DR-113-help-mechanism-redesign.md` §1 (L35-37) / §2 内部セル写像 (L107-115) / §4.4 (L317-318)、`schema/fixture.schema.json` L213-223 (category_mode)、`fixtures/help/absent-category.json` (書き直し中の対象 fixture、default/all の 2 case を Q13 保留)

**波及**: 裁定後 DR-113 L35-37 の文言を明確化 + absent-category.json の 2 case expect 確定 + fixture 追補 land。

**回答形式**: `Q13=a` 等。
