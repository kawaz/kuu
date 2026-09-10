---
title: エコシステム外部レビュー(2026-09)の指摘への対応検討・採否記録
status: resolved
category: tech-memo
created: 2026-09-10T14:59:52+09:00
last_read:
open_entered: 2026-09-10T14:59:52+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-09-10T15:01:09+09:00
discard_reason:
pending_reason:
close_reason: ["discarded:K-1却下(DR-113不在)", "pending:K-2裁定待ちのまま記録保持", "done:K-3採用(未実施、次回ついでに)"]
blocked_by:
origin: kawaz依頼(2026-09-10、claude-rules-personalセッション経由)
---

# エコシステム外部レビュー(2026-09)の指摘への対応検討・採否記録

## 概要

外部レビュー (2026-09-09〜10、claude-rules-personal リポの
`docs/research/2026-09-10-ecosystem-review/kuu.md`) に本リポ (kuu / kuu.mbt)
向けの指摘が 3 件あった。実物 (README / VISION / issue ディレクトリ / DR 一覧)
と照合した上で採否を決定し、以下に記録する。

## 背景

kawaz からの依頼: レビューは初版の指摘から個別プロジェクトの精読を進める
たびに認識が改まり、指摘が覆されたケースが多いため、全面的に鵜呑みにせず
実物と照合してから採否を決めること、との温度感が付いていた。

## 検討内容

### K-1 (レビュー原文は「訂正」扱い) conformance の pass 状況は README に既にある

- レビュー自身が「訂正」と明記: v1 の「fixture の pass 件数を README に出す」は
  既に達成 (kuu.mbt README/README-ja に `decoded=317, ran_cases=733,
  mismatches=0` を確認、実物一致)。
- 残る副次指摘「5 プロファイル (parse-core/lowering/definition-error/
  completion/help) のどれが green かが README から読めない」は、根拠として
  挙げられた「DR-113 §9 (5 プロファイル全 green が v1.0.0 条件)」の実在を
  確認したが、**kuu にも kuu.mbt にも DR-113 は存在しない**
  (kuu.mbt の decisions は MDR-001〜006 のみ、kuu 本体側は DR-065/069/132 等は
  実在するが 113 は無い)。
- **判定: 却下**。存在しない DR を根拠にした指摘のため、5 プロファイル表の
  追加は見送る。v1.0.0 条件を明文化したいなら、それは本レビューとは独立に
  kawaz が ROADMAP.md 等を見て必要性を判断すべき別件。

### K-2 open issue 36 本の大半が 8/16〜17 の棚卸し起票

- 実物確認: kuu.mbt/docs/issue/ の `.md` 37 件のうち `created` が
  2026-08-16/17 のものは 16 件 (レビューの「20 本」とは一致しないが、
  「大半が同時期に集中して起票された」という定性的な指摘自体は妥当)。
- レビューの修正案 (「K-1 の 5 プロファイル表を先に埋めて green でない
  プロファイルから着手する」) は K-1 の判定により根拠が崩れているため無効。
- **判定: 裁定待ち**。棚卸し issue の再開順序・優先度は趣味プロジェクトの
  気分次第という温度感がレビュー本文にもあり、kawaz の裁定が要る。

### K-3 kuu-cli 構想と他リポの CLI パーサの接続

- 実物確認: kuu/main/docs/VISION.md §3 に「幻影コマンド」構想が存在し、
  `corpus/real-cli/die.json` も実在 (die の実 CLI 定義を kuu で再現する
  コーパス)。kuu-cli リポも実在し `docs/` + `impl/` を持つ。
- 指摘「VISION から kuu-cli の実装現況が読めない」は VISION.md §3 を読む限り
  妥当 (構想記述のみで実装進捗への言及なし)。
- **判定: 部分採用**。VISION §3 か ROADMAP に kuu-cli リポの現況 (どこまで
  動くか) を 1 行足す小改修は価値がある。stable-which / bump-semver との
  接続構想 (「`app.json` 1 つで kuu-cli 経由になる」) は構想レベルで緊急性は
  無く、この 1 行追記でカバーできるため個別 issue 化はしない。

## 採否まとめ

| 項目 | 判定 | 備考 |
|---|---|---|
| K-1 (5 プロファイル表の追加) | 却下 | 根拠の DR-113 が実在しない |
| K-2 (issue 棚卸し再開順序) | 裁定待ち | kawaz の判断が必要 |
| K-3 (VISION/ROADMAP へ kuu-cli 現況 1 行追記) | 採用 (未実施) | 対応タイミングは担当セッションまたは kawaz に一任 |

## 受け入れ条件

- [x] レビュー指摘 3 件を実物照合の上で採否判定した
- [ ] K-2 は kawaz の裁定が出た時点で別途対応 (本 issue のスコープ外、裁定が
      出るまでは記録として残す)
- [ ] K-3 の VISION/ROADMAP 1 行追記は次に該当ファイルを触るセッションが
      ついでに実施してよい (未実施のまま close する)
