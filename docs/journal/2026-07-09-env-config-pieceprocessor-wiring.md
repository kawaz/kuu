# env / config 値源の pieceProcessor 配線ギャップ 2 件を一括解消

2026-07-09 の記録。前サイクル (ref テンプレの result row 形裁定) に続き、kuu.mbt 側で
裁定済みとして積まれていた乖離 bug 2 件 (env × separator / config string × pre_filters、
いずれも DR-049 §2 / DR-050 §4 からの実装乖離) を 1 サイクルで解消した。

## 対象の乖離 (impl-prefilters worker が pre_filters 配線中に発見、既に裁定済み)

- `env-separator-split-gap`: DR-049 §2「env から来た値は string であり、要素の
  pieceProcessor を通る。multiple 要素なら separator 分割も効く (発火 1 回の 1 引数と
  同じ扱い)」に反し、env seat が raw string を分割せず単一 piece 扱いにしていた
- `config-string-pieceprocessor-gap`: DR-050 §4「string → CLI / env と完全に同一の
  全段 pipeline (pre_filters → parse → post_filters)」に反し、`config_to_value` が
  pre_filters を一切通していなかった

両 issue とも裁定は不要 (DR に既に規定済み)、実装バグの pin 作業として着手した。

## spec fixture (2 本、commit `93efbcf8e445b75ed871844baf1e33c05e9d3d4c`)

- `fixtures/multiple-parse/env-separator-split.json` (4 case): 文字列分割の基本形 /
  型付き piece の number parse / per-piece pre_filters (trim) / piece parse 失敗の 4
  輪郭。CLI 版 (`separator-split.json`/`separator-typed.json`) の env 拡張として
  multiple-parse/ に配置
- `fixtures/pre-filters/config-source.json` (3 case、`env-source.json` と対称): trim
  通過成功 / pre_filters 欠如時の parse reject / non_empty による filter reject (parse
  より前に効く) の 3 輪郭

裁定の要る事項は発生しなかった: 未発火 multiple 要素の `[]` / `sources: "default"` は
DR-044 (一様配列規約) + DESIGN §11.4 (値源ラダーの終端 rung = default) から、
env/config 由来失敗の `argv_pos: 0` は CONFORMANCE §2 の明文 (「どのトークンにも帰属
しない失敗は argv.length を指す — env / config 由来の値の失敗を含む」) から、それぞれ
一意に導出できた。

config × separator の解釈疑義 (config の array 値に separator が絡むか) も、着手前に
DR-050 §4 の明文 (「array → multiple 要素の分割済み pieces として accumulator へ
(separator は CLI の 1 引数を分割する機構であり、config では登場しない)」) で先制的に
解消されていた — fixture 化の時点で疑義として持ち込む余地が無かった。

## kuu.mbt 実装 (commit `cbd42917d7b9278393fe400cf7883cc9b2e7baeb`、CI success)

- env seat: 既存の split_on (separator 分割) を共用する形に配線し直し、piece ごとに
  `env_value` (pre_filters → parse → post_filters) を通す all-or-nothing 経路に
- `config_to_value`: pre_filters を配線 (CStr 由来の値にのみ適用、型一致 source は
  そもそも pre_filters の適用対象が無いのでスキップ — DR-050 §4 の型帰結どおり)、
  KFilter/KParse の区別も配線
- harness 側: `proj_sources` (sources フィールド構築) が未発火 accum セルの
  `default` 報告を欠いていた穴を accum 全般へ拡張。production 実装は元々正しく
  `default` を返していたので、これは harness の表示側だけの gap だった

## codex レビュー指摘なし

前サイクル (ref テンプレ row 形) の Major 4 件検出と対照的に、今サイクルは codex
レビューで指摘 0 件だった。値源配線は既存の pieceProcessor 経路 (CLI 用に確立済み)
をそのまま再利用する形になり、新規 Node / sentinel 方式のような新規機構を要しなかった
ことが効いたと見られる。

## 運用メモ

- worker の pin bump 漏れを監査で捕捉、`ci.yml` を spec commit `93efbcf8` へ更新
- 最終数値: conformance decoded=150 / ran_cases=382 / skipped=0 / mismatches=0、
  kuu.mbt テスト 167 本全 pass

## 残 issue

- spec: `ref-nested-consumption-fixture-gap` (先食み×ref入れ子 / option ref repeat
  min:0 sibling trigger 境界 / multiple×ref 意味論の 3 点、fixture 未整備、前サイクル
  からの継続)
- kuu.mbt: `multiple-ref-accum-gap` (multiple × ref の accumulator 配線、前サイクル
  からの継続)
