---
title: 「canonical help レンダラの設計 (層 2) — テンプレ/クロージャ/パーツのレイヤ分類と help_xx config 統合」
status: resolved
category: design
created: 2026-07-18T13:45:29+09:00
last_read:
open_entered: 2026-07-18T13:45:29+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-21T05:50:29+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-115","finding/2026-07-21-help-renderer-design-plan","done:REND-Q1〜Q7裁定完了(1a/2b/3a/4b/5a/6b/7a、kawaz 2026-07-21)、completion表示policyはREND-Q7=aでcompletion-ordering issueへ統合、実装は次フェーズ"]
blocked_by:
origin: 自リポ TODO
---

# 「canonical help レンダラの設計 (層 2) — テンプレ/クロージャ/パーツのレイヤ分類と help_xx config 統合」

## 概要

DR-112 (help query / model の素材契約) の後続として、**help model を消費してテキストを
組むレンダラ層 (層 2)** を設計する。kawaz 発題 (2026-07-18): 「ヘルプ出力の微調整の
ためのテンプレやクロージャ導入やパーツのレイヤー分類などとかはどうします？ヘルプ
文字列を構築する上で最終的にどうしても必要になる」。方針裁定済み: **素材の形
(DR-112) が先、レンダラは後**。

## 背景

### kawaz の方向性の示唆 (2026-07-18)

> 「レンダラの調整やテンプレ指定なんかも help_xx (属性) で config 一括と個別調整
> 併用とかで書く流れですよねきっと」

— レンダラ設定も wire の help_xx 語彙系列に乗せ、config (definition/command レベル
の一括) + 要素個別の併用で書ける形を想定する。

### 統括の初期見立て (設計プランの足場)

- **レイヤ分類 3 層案**: (1) セクション骨格 = テンプレート層 (usage/description/
  groups/options/commands/epilog の並び)、(2) パーツの 1 行構成 = 部品関数層
  (オプション行の `--port, -p <PORT>  説明 [default: 8080]` の組み方)、(3) 文字列
  整形 = プリミティブ層 (幅/折返し/色/パディング)
- **クロージャ vs テンプレの本質論点**: テンプレを spec 語彙にすると多言語で同じ
  カスタマイズが移植できる利点 vs テンプレ言語の発明という沼。クロージャは各言語
  DX (UsefulAST 層) の自由に自然に落ちる
- **実測の足場** (docs/findings/2026-07-17-cli-help-vocab-survey.md): clap
  `help_template` (プレースホルダタグ型: {name}/{usage}/{all-args} 等) と picocli
  `sectionKeys`/`sectionMap` (セクション並べ替え + 関数差し替え型) が二大パターン
- P4 (canonical レンダラ = kuu 標準提供のテキストレンダラ、kuu-cli の --help
  self-hosting) の設計と同時に扱う

### 関連する隣接論点 (同サイクルで扱うか判断)

- **completion 側の「レンダラ」= 生成器の表示 policy** (kawaz 発題 2026-07-18):
  zsh の候補説明 (`_describe`)、deprecated マーカーの自動表示等。素材 (meta) は
  搬送済みで、canonical 生成器の既定 policy として決めれば足りる見立て (レンダラ
  「層」の仕様化までは不要寄り)。候補への help 文字列同梱の要否 (現行は origin
  経由で定義を引き直す前提) も設計余地
- DR-109 柱 4 の「exit class」policy 推奨 (help/version は exit 0 等) を層 2
  ガイドラインに書く余地 (DR-112 射程外節より)

## レンダラ設計への反映素材 (DR-113/DR-114 land、HIP-META-Q10-α/β 裁定確定)

DR-113 (help 機構再設計) と DR-114 (universal fn 統合) が land、HIP-META-Q10-α/β
= a 裁定確定 (mid=48)。canonical レンダラ設計 (本 issue) に反映すべき素材:

1. **5 直交 type → category_mode contract** (Q10-α): help/help_all_category/
   help_category/help_show_hidden/help_tree の cell 値からアプリ側が
   category_mode を組んで query に渡す
2. **query 不在時の失敗 envelope** (Q10-β): query-error absent-path/
   absent-category を definition_error と分離
3. **value_structure**: tree + type_ref + types + origin のモデル素材
4. **pipe 曖昧回避**: HIP-META-Q4 付録 1 (集約 vs 1 行 inline vs 詳細説明形式)
5. **レンダラ policy 指定オプション語彙**: HIP-META-Q4 付録 2 (mid=20 kawaz
   「後日レンダラポリシー指定オプション語彙追加で 1 行表現も選択可能」)
6. **version binding**: mid=11 kawaz「パーサ外から binding を与えてテンプレで
   使う仕組みは設計としてありうる」
7. **types セクションの共有型集約表示**: HIP-META-Q4 付録 2 (mid=17 kawaz 例)

REND-Q バッチ着手時はこれらを統合して設計プランを起草、DR 化して canonical
レンダラの spec 関与範囲を確定する。

## 受け入れ条件

- [ ] レンダラ設計プラン (findings) 起草 — レイヤ分類 / テンプレ語彙の spec 収載
      範囲 / クロージャとの分担 / help_xx config 統合の形
- [ ] REND-Q バッチで裁定
- [ ] DR 化 (レンダラの spec 関与範囲) + canonical レンダラの実装計画
- [ ] completion 生成器の表示 policy (candidate 説明・deprecated マーカー) の扱いを
      本サイクルに含めるか判断

## 関連

- DR-112 (help query / model — レンダラに渡す素材の契約) / DR-109 柱 4 (semantic
  model + policy まで共通、renderer は言語側)
- DR-113 (help 機構再設計 — 5 直交 type、value_structure tree + type_ref +
  types + origin) / DR-114 (universal fn 統合 — cell_fns を使う default_fn)
- HIP-META-Q10-α/β (category_mode contract・query-error envelope 裁定) /
  HIP-META-Q4 付録 1・2 (pipe 曖昧回避、レンダラ policy 語彙、types 集約表示)
- docs/findings/2026-07-17-help-mechanism-design-plan.md §7 (沼の線引き — 仕様外を
  明言した範囲の再検討がレンダラ設計の入口)
- docs/findings/2026-07-17-cli-help-vocab-survey.md (clap help_template / picocli
  sectionKeys の実測)
- docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md (生成器設計の
  隣接 issue)
