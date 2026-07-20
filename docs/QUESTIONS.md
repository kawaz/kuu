# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 HIP-META-Q14: count preset の wire 糖衣規則を DR-114 に規範化

**背景**: DR-114 §6.1 は lowered carrier (`{fn:"incr",args:[]}`) を規定済みだが、**wire 層の糖衣規則** (旧 DR-077 §3 が担っていた「`{type:"count", long:true}` の canonical 展開」) が DR-114 に無い。P2 で docs-fn-p2 worker の発明ガードが検出 (issue: `docs/issue/2026-07-20-dr114-count-wire-sugar-underspecified.md`)。P3 Milestone 2 (count → incr 置換) の実装前に確定が必要。

**論点**: count preset の long 糖衣を DR-114 でどう規範化するか?

- **候補 a** (統括推し): **糖衣差し替えのみ規範化** — `{type:"count", long:true}` は count preset が type-independent の `[":set"]` 糖衣を `[":incr"]` に差し替える (旧 DR-077 と同じ機構、flag preset の DR-076 §2 規則 1 `long:true → [":set:true"]` と対称)。0-token 発火のみで主入口・eq_split なし。等価: `{type:"count", long:true}` ≡ `{type:"number", default:0, long:[":incr"]}`。非空明示リストへの補完規則は設けない (count に値形が無いため補完対象が存在しない)
- **候補 b**: 差し替え + flag 規則 2 相当の補完規則も定義 (明示リストに `:incr` を冪等補完)
- **統括推し理由**: 既存 fixture (count-parse 3 本 + lowering/count/bare-increment) が pin する意味論は a の範囲で完結。b の補完は出現場面が無く、無い規則を対称性だけで足すのは v1 完備主義でなく過剰設計側

**参照**: `docs/decisions/DR-114-universal-fn-integration.md` §6.1、`docs/issue/2026-07-20-dr114-count-wire-sugar-underspecified.md`、`fixtures/lowering/count/bare-increment.json`、DR-076 §2 (flag preset の対称元)

**波及**: 裁定後 DR-114 に count preset 糖衣の節を追記 (dr114 系 worker 委譲) → P3 M2 実装がそれを oracle に count を cell_fns.incr へ置換。

**回答形式**: `Q14=a` 等。
