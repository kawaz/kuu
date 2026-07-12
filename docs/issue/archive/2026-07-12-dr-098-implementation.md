---
title: DR-098 を実装完了する
status: resolved
category: task
created: 2026-07-12T18:29:54+09:00
last_read:
open_entered: 2026-07-12T18:29:54+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-12T19:10:45+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-098","implemented: kuu.mbt commit a396d21b (tty_provider + ladder 5位 + definition-error + expected_skips 台帳空復帰)","implemented: conformance decoded=201/ran_cases=536/skipped=0/mismatches=0, CI green 確認済み (2026-07-12)","implemented: codex 事後レビュー Critical/Major なし","note: 直後に kawaz 裁定で型化リワーク (DR-099 予定, wire属性 tty: を type:\"tty\" に置換) が決定 — 本issueの実装は DR-099 で部分的に置き換わる予定"]
blocked_by:
origin: 自リポ TODO
---

# DR-098 を実装完了する

## 概要

DR-098 (tty 判定の値源化) は DR 起草・DESIGN/schema 追随・fixtures 新設・corpus 更新までは完了しているが、kuu.mbt 側の実装 (tty_provider / tty installer / definition-error 検査) が未着手のまま残っている。この実装を完了させる。

## 背景

- 元 issue: `docs/issue/2026-07-07-tty-value-as-injected-source.md` (DR-098 本文 §波及 の記述では「DR 起草 + fixture 化の完了をもって close」予定だが、本 issue 起票時点ではまだ archive されておらず active のまま — INDEX.md にも掲載中)
- 対象 DR: `docs/decisions/DR-098-tty-injected-value-source.md`
- DR-098 の決定事項の要約:
  - `tty_provider` を `env_provider` / `config_provider` と同列の registry 単一スロット (`(stream: "stdin"|"stdout"|"stderr") -> bool | null`) として新設し、wire 属性 `tty` で bool 値要素に注入する
  - 値源ラダーの挿入位置は `default` の直前・`inherit` の直後 (`cli > link > env > config > inherit > tty > default`)
  - 評価器の純粋性は不変 (ambient probe の実行は provider 実装に閉じる、評価器自身が `isatty()` を呼ぶことはない)
  - source タグに `tty` を追加
  - DESIGN §13.9 の TTY 責務外記述を「値の注入は射程内、能動センシング/レンダリングは引き続き責務外」に改訂 (DR-098 本文で改訂案文まで確定済み)
- 実機検証で以下 2 fixture が UNEXPECTED SKIP になることを確認済み (= kuu.mbt 側の未実装が原因):
  - `fixtures/value-sources/tty-ladder.json` (ラダー位置の輪郭)
  - `fixtures/definition-error/tty-non-bool.json` (DR-098 §4 の definition-error 輪郭)

## 受け入れ条件

- [ ] `tty_provider` registry スロットを実装 (env_provider/config_provider と同型の単一スロット、production 既定実装は各言語 DX の関心なので kuu.mbt では conformance/fixture 経由の注入を優先)
- [ ] `tty` installer を実装 (wire 属性 `tty` の 3 値 enum 席宣言、値源ラダーへの `inherit` 直後・`default` 直前挿入)
- [ ] DR-098 §4 の definition-error 検査を実装 (非 bool 値プリミティブ / 値なし要素 (`type: "none"`) / `flag`・`count` プリセット への `tty:` 付与を kind=`invalid-range` で検出)
- [ ] `fixtures/value-sources/tty-ladder.json` が UNEXPECTED SKIP でなく pass する
- [ ] `fixtures/definition-error/tty-non-bool.json` が UNEXPECTED SKIP でなく pass する
- [ ] `option has unsupported key 'tty'` 起因の skip ledger エントリを解消
