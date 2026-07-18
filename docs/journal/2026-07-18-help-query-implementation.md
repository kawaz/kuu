# 2026-07-18 help query 実装サイクル (DR-112 P2、kuu.mbt 3 里程標)

kuu.mbt に help query (DR-112 の P2 実装側) を実装した。fable5-high が実装指示書を
作成 → codex-sol が実装 (3 里程標、3 commit) → fable5-high がブレ検査、という編成
で 1 サイクルを回した。

## 実装結果

kuu.mbt へ 3 commit:

- `7576ae0b` (M1): 表示メタ語彙 decode + HelpMetaInstaller + 定義時検査 3 種を
  追加。runner の `definition_error` element を optional 化
- `5547f383` (M2): help model 射影。installer fixpoint 後の宣言 snapshot を
  AtomicAST に同梱
- `cd37433d` (M3): conformance runner に `query:"help"` の dispatch を追加

最終状態は moon test 397/397、conformance decoded=293/ran_cases=702/skipped=0/
mismatches=0 で help/ 配下 13 fixture 全て green。

設計要点:

- AtomicAST に declaration snapshot を同梱し、raw JSON の再読を避けた
- `ElemDef.default_declared` で明示 default のみを射影する
- group 宣言は空 name + `help_group_name` で表現する
- 重複綴りは宣言順で dedup する

## fable5-high によるブレ検査 (verdict: ship 可)

- 偽 green なし。`known_divergences` / `expected_skips` とも空のまま通っている
- runner の比較変更は `definition_error` element の optional 化のみで、既存
  fixture に対して等価な厳密さを保っている
- グループ再宣言は「食い違う再宣言のみ def-error、同一設定は冪等で合法」という
  DR-112 §5-6 準拠の正しい実装だった

指摘は 8 件 (Medium 3、Low 5)。いずれも spec 側 fixture で未 pin の領域:

- 名前付き alias の宣言位置喪失
- command entry の `aliases` / `hidden` / `deprecated` がハードコード
- `depth:"all"` が 1 層に silent fallback する

これらは HIP-Q バッチとして `docs/QUESTIONS.md` に登録済み。

## spec 側の追随

`docs/QUESTIONS.md` に HIP-Q1〜Q7 を追記 (spec main `16e10b20`)。全問「実装は
暫定採用形で green、裁定は急がない」形式で記録した。

lockstep 窓を実行:

1. spec push `16e10b20`
2. kuu.mbt pin bump + push `895a51ba` (CI success 確認済み)
3. kuu-cli pin 2 本 bump + push `3065a478`

kuu-cli は事前にローカル conformance 588/588 pass + 91 skipped (query != parse)
を確認している。help query は parse 以外の query なので kuu-cli runner では
skip 扱いとなり、pin 追随だけでは壊れないことを裏取り済み。

## 将来の注意点

- `fail_action` → `on_failure` リネーム時の罠: kuu.mbt の help_entry 導出が
  `fail_action` ベース (`src/kuu/help.mbt:523-533`) のため、`on_failure` が
  version 等に開いた時「`on_failure` な flag が help_entry に化ける」事故が
  起きうる。リネーム作業のチェックリストに含めること
- alias ペアリングが index-zip (desugar の生成順依存)。desugar 変更時は
  identity ベース照合への置き換えを検討する
- kuu-cli 側の help プロファイル対応 (P3) は未着手

## 関連

- `docs/decisions/DR-112-help-query-and-model.md` (help query の設計正本、P2
  実装がこのサイクルの対象)
- `docs/QUESTIONS.md` HIP-Q1〜Q7 (fixture 未 pin 領域の裁定待ち)
- kuu.mbt commit `7576ae0b` / `5547f383` / `cd37433d` (M1〜M3)
- kuu.mbt pin bump push `895a51ba`
- kuu-cli pin bump push `3065a478`
