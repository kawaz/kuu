# 裁定・確認待ち一覧 (ユーザ用)

## 運用規約

<details>
<summary>ゼロコンテキストエージェント向け（本セクションは消さない）</summary>

- 裁定/確認待ち項目を 1項目=1ラベル=1セクション で記載
- ラベル形式: XX-Q1（バッチやセッション内で一意な短プレフィクス、Qn単独の使い回し禁止、長期一意性は不要)
- 依頼形式: 「👺XX-Q1 の裁定お願いします」（参照用途ではラベルに👺を付けない。誤陽性がユーザのハイライト/アラームを汚す）
- チャット提示と同一ターンで本ファイルに記録 + path 指定 commit (push はリリース窓に同乗)
- 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue / journal / close_reason) へ反映。本ファイルは常に「現在待ち」だけを持つ
- 参照は[]()で提示（リポ内は相対、リポ外はフルパス）
- 初版質問/依頼は長文で書かない（ユーザが説明を求めらたら本ファイルに説明を追加し、チャットで👺ラベルで再依頼）
- **選択肢・確認項目は `- [ ] a: …` 形式（チェックボックス + ラベル）で書く**。
  Q / C で記法を分けない。回答は「チェックを付ける」でも「XX-Q1a」と言葉で返すでも通る
  （複数まとめてチェックし「チェックしたよ」の一言で済ませる運用を想定）

</details>

## 裁定待ち

### GATEKIND-Q1: 「spec 上合法だが実装が未対応」を機械可読に区別する kind を設けるか

背景: kuu.mbt は ref+link / structural body+link (DR-029 上は合法) を一時 gate で拒否しており、kind は
`invalid-range` (= [DR-054](decisions/DR-054-parse-definition-failure.md) の「定義が不正」語彙) を流用している。
message は「not supported by this implementation」だが、**kind だけ見る機械 (conformance 比較・ツール連携) には
「この定義は違法」と区別が付かない** (ゼロ知識レビュー M6)。

- [ ] a: DR-054 の kind 列挙に `unsupported` (実装制限。spec 合法・当該実装が未対応) を追加する。
      conformance 上は「この kind を返す実装は当該機能の green を主張できない」の位置づけ
- [ ] b: kind は増やさず現状維持 (invalid-range 流用)。実装制限は message / docs の人間可読情報に留める
- [ ] c: kind でなく error object に `unsupported: true` 等の optional フラグを足す

統括推し: **a**。準拠プロファイル (CONFORMANCE §0) が「部分実装」を前提にしている以上、「未対応」を
第一級の語彙にする方が体系と整合する。b は「kind の嘘」が残る。c は比較規約 ((element, kind) 集合) に
第 3 軸が入り複雑化する。懸念: kind 列挙は閉集合として全実装が写像しているので、追加は互換影響がある
(v1 前なので今なら安い)。

### CHILDDEF-Q1: or/seq 子の `default:` 綴りは const の同義のままで良いか

child repeat/multiple 開放の調査 (2026-07-27) で浮上。現行規定 (DESIGN §5.2、今日更新分) は
「or/seq 子の `value:` / `default:` は**両方とも**消費 0 の宣言定数 (const)」— つまり子の `default:` は
「無い時に埋める」ではなく「最初からいる」の別綴り。

一方、const 裁定の原理は「**const は値セルに最初からいる。default は無い時に埋める**」で、
綴りと位相を対応させるなら「`value:` = const、`default:` = 充填」が位置非依存で一貫する。
将来 child に `optional` / `repeat` が入ると「optional な子 + 無ければ default で埋める」という
fallback 表現が意味を持つが、現行規定のままだと child の `default:` は常に消費 0 const なので
その表現が書けない (fallback を書きたければ optional 化 + `default:` の充填読みが要る)。

- [ ] a: 現行維持 — child の `default:` は const の同義綴り。fallback が要る場面は将来
      「optional 子 + 別の綴り」等で解決 (今は決めない)
- [ ] b: 位置非依存に統一 — `value:` = const (初期値)、`default:` = ラダー充填 (無い時に埋める)。
      child 位置の `default:` の意味が変わる **破壊的変更** (今日 push した
      literal-child-default-parity fixture / DESIGN §5.2 / DR-031 の改訂が必要。
      ただし v1 前なので互換コストは今が最安)
- [ ] c: 保留 (child repeat/optional 実装の設計時に決める — その実装は規模大で当面先)

統括推し: **b**。「const = 最初からいる / default = 無い時に埋める」という裁定原理が綴りと 1:1 に
対応する方が、位置で意味が変わる a より学習コストが低い。b の実害: 現 corpus で child `default:` を
使う fixture は literal-child-default-parity 1 本のみ (今日追加) で、書き直しは局所。懸念:
child (非 optional) の `default:` は「必ず消費する子」に付くと死に宣言になる — それは root の
value+default 併存と同じ「影」の扱い (lint 領分) で整合する。

## 確認待ち

(現在なし)
