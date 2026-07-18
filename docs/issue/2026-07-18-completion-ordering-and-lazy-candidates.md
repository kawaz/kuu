---
title: 「補完候補の順序制御 (order 系の反映) と lazy 補完 (peco/fzf 型) の許容 — 補完側の設計論点 2 件」
status: open
category: design
created: 2026-07-18T11:22:21+09:00
last_read:
open_entered: 2026-07-18T11:22:21+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO
---

# 「補完候補の順序制御 (order 系の反映) と lazy 補完 (peco/fzf 型) の許容 — 補完側の設計論点 2 件」

## 概要

help 設計サイクル (2026-07-18) で kawaz が指摘した補完側の設計論点 2 件。help DR の
order 系語彙 (help_group_order / help_order / help_after) の意味論確定後に検討する。

## 背景

### 論点 1: order 系の補完への反映

kawaz 指摘: 「グループオーダーとオプションオーダーは補完に関わる可能性がある」—
補完候補の提示順を定義者が制御したい場面 (よく使うオプションを先に出す等)。

現状: DR-104 §4 は candidates の比較を**順序非依存の multiset** としており列挙順は
非規範。DR-060 §3 は絞り込みポリシーを生成器側の選択とする。

検討方向 (未裁定):

- candidates の列挙順に order 系を反映する (比較規約は multiset のまま = 順序は
  SHOULD 扱い) — 最小干渉
- meta に order 値を載せて生成器に委ねる (zsh の group 表示等 shell 側機能との対応は
  生成器の関心)
- 何もしない (補完順は shell/生成器の完全な自由)

注意: 補完の表示順は shell 側挙動 (zsh compadd の group、fish の sort) に強く依存する
ため、spec が列挙順を SHOULD 化しても最終表示順は保証できない。「どこまでが素材で
どこからがポリシーか」の線引き (DR-060 §3 の原則) をこの論点にも適用して決める。

### 論点 2: lazy 補完 (peco/fzf 型) の許容と順序確定ロジック

kawaz 指摘: 「lazy 補完を許容するかの話もあるよね、その場合のオーダー確定ロジックの
決定とかも。例えば peco とか fzf とかであるけど」

解釈 (裁定時に要確認): 候補集合を一括で確定して返す現行モデル (complete query は
同期的に candidates 配列を返す) に対し、peco/fzf のような**インタラクティブ絞り込み
UI に候補をストリーム供給する / 遅延評価で候補を生成する**形を許容するか。関わる
既存設計:

- complete query の出力契約 (DR-104): candidates は有限配列。lazy 化するなら
  「candidates の生成が逐次」でも観測等価になる範囲の規定が要る
- completer は名前参照で実行しない (DR-060 §4)。動的 completer の実行は生成器配線 —
  lazy 性はこの層 (生成器 ↔ アプリ関数) の契約に自然に置ける可能性が高い
- runtime 問い合わせ ABI (DR-109 柱 6、未実体化) — lazy 供給を許すなら ABI 設計
  (ストリーム/ページング/キャンセル) に直結する
- 順序確定ロジック: lazy 供給では「全候補が出揃ってからソート」ができない —
  order 系を反映するなら「供給順 = 確定順」とするか、生成器がバッファして整列するか
  の規定が要る

## 受け入れ条件

- [ ] help DR (P1) の order 系意味論確定後、論点 1 の裁定質問を QUESTIONS.md に提示
- [ ] 論点 2 は runtime 問い合わせ ABI の設計 (completers registry 実体化) と同時に
      検討 — lazy 許容の裁定と、許容時の順序確定ロジックの規定
- [ ] 裁定結果を DR (補完側の追記 note or 新 DR) に反映

## 関連

- DR-060 §3/§4 (素材とポリシーの分離、completer 名前参照) / DR-104 §4 (multiset 比較) /
  DR-109 柱 6 (runtime 問い合わせ) / DR-111 §5-§6 (completer descriptor の最小形、
  io_type は ABI 確定待ち)
- docs/findings/2026-07-17-help-mechanism-design-plan.md (order 系語彙の設計出所)
