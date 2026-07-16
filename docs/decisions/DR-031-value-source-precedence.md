# DR-031: 値源の優先順位

## 決定

1つの結果セルに複数の値源がつきうる。優先順位は以下で固定する (高→低):

```
1. CLI 明示 / link    パース時の操作 (今この実行で明示指定)
2. 環境変数            実行環境の指定
3. config ファイル     永続設定
4. inherit (祖先 scope) 上位スコープからの暗黙継承
5. default / value     最終フォールバック (固定値)
```

「明示的に与えられたものほど優先」が原則。

## 各順位の根拠

- **CLI/link が最優先**: 「今この実行で明示的に言った」が最も具体的な意図。CLI と link は同列 (どちらもパース時のユーザ操作、DR-029 の「操作の時系列適用」がこの層)。
- **env > config**: 環境変数は「この実行環境で」の一時的指定、config ファイルは永続。一時 > 永続 (12-factor app 慣習)。
- **config > inherit**: 設定ファイルは明示的に書かれた値、inherit は「書かなければ親から」の暗黙継承。明示 > 暗黙。
- **default 最下位**: 何も来なかった時だけ。

## 順序は固定 (設定可能にしない)

値源優先順位には事実上の標準 (CLI > env > config > default) があり、動かしたいケースは稀。固定にして利用者の認知負荷を下げる。順序を設定可能にすると、それ自体が暗黙の罠になる (kuu の「暗黙ルールを増やさない」思想に反する)。動かしたい稀なケースは link や実体ノードの工夫で表現する。

## source の記録 (DR-016 拡張)

DR-016 の `source: cli/env/default` を、値源の増加に合わせて拡張:

```
source ∈ { cli, link, env, config, inherit, default }
```

結果オブジェクトで「この値はどこから来たか」を引ける。appconfig ストア用途 (DR-030) で、値源を隠蔽しつつ必要なら由来を確認できる。

### source の確定ルール (境界条件)

source は「**最終値を確定させた効果 / 充填の由来**」であり、以下で一意に決まる:

- 自分の入口 (long/short/alias 等) からの効果 = `cli`、**link 越しの効果** (他要素の入口から link で飛んできた) = `link`。両者はラダー同順位で、区別は経路の違いのみ
- 席の充填 = その席の名 (`env` / `config` / `inherit` / `default`)。config が立つ条件は DR-050 (config 席の lookup 成功)
- **あと勝ち mutation 後は最後に勝った効果の source** (履歴は効果列 = 詳細モードの関心、DR-045)
- **effect op=default** (`--no-x` の "no:default"、committed=true) 適用後は `cli` — 値の内容が default 値と同じでも、その値を確定させたのはユーザの明示操作
- **effect op=unset** (committed=false) は「触っていないことにする」ので source を確定させない — その後に勝った席の充填の source になる (env が埋めれば `env`、最後まで無ければ `default`)

## committed/selected との直交性 (DR-016 維持)

「その値が明示的に決まったか (committed/selected)」と「値そのもの (default で埋まっただけか)」は別軸。これは優先順位とは直交する別軸で、DR-016 の区別を維持する。制約の判定入力 (required は値の有無、exclusive_group / requires トリガは committed) は DR-047 が確定する。

## 関連

- DR-013 (inherit), DR-014 (config) — 値源の機構
- DR-016 (source, committed/selected) — source 語彙を拡張、committed 区別を維持
- DR-029 (link は CLI と同列のパース時操作)
- DR-030 (実体だけノード、appconfig ストア)
- DR-047 (制約評価のレイヤリング — 遅延述語の評価対象は本ラダー充填後の最終状態)

> **追記 (UX-Q7R、kawaz 再裁定 2026-07-16 — 裁定経緯は DR-109 §7 の再裁定確定 note)**:
> default 席の充填判定が見る cell を明確化する。default 解決は「値 cell が空のままなら注入する」という本 DR の既存意味論のまま変わらない。export_key 共露出 (相異なる複数要素が同一の結果キーへ解決する構造、DR-052 / DR-073) の下では、この充填判定の対象を **export_key 適用後の結果 cell 単位**とする — 冒頭の「1つの結果セル」は共露出下では射影後の結果キーが指す cell である。
>
> - 例: a・b がともに export_key x を持ち `--a` だけが発火した場合、b の default 解決は「結果 cell x は (a の cli 値で) 空でない」を見て注入しない。b の default 値が共露出キー x に現れることはなく、**衝突自体が発生しない** — 衝突検査 (DESIGN §15.5) への例外規定ではない
> - 対極: **default より上の席 (env / config / inherit) の充填は遠慮しない**。上位席の値は「何も来なかった時のフォールバック」ではなくユーザ / 環境の意思表示であり、結果 cell が他実体の値で埋まっていても実際の共露出として成立する — 本物の衝突で ambiguous (DESIGN §15.5 / DR-073)
> - ラダーの優先順位 (cli > env > config > inherit > default) は **1 実体の値 cell 内で値源を選ぶ規則**であり、実体間のキー占有の競合をラダー順位で解決しない (a の cli と b の env が並んでも「cli が勝って success」にはならない — provenance 競合 = ambiguous、DR-073 §2)
>
> fixture: `fixtures/export-key/collision.json` (single-exposure-ok の resolve 相込み検証 / env-claim case)。
>
> **追記 (EXP-Q1、kawaz 2026-07-17)**: 共露出実体の宣言 default が**異なる値**の場合 (両者未発火・上位席なし)、どちらが cell を埋めるかを定義順などの順位規則で解決しない — 両 default が同一 cell を主張する provenance 競合として **ambiguous** に倒す (claimants が解釈を区別する、DR-073)。同値 default は観測可能な競合が無いため success のまま (`collision.json :: defaults-only-no-collision`)。定義時は「共露出キーの異 default 値」を DESIGN §15.6 の warn に加える (warn + 実行時 ambiguous の二段構え)。順序ベースの優先を退けるのは DR-038 (完全経路の一意性、優先なし) / DR-042 (installer 合成の順序非依存) と同じ線。fixture: `fixtures/export-key/collision-default-divergent.json`。

## Superseded (歴史)

> 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。

### required の判定入力 (DR-047 で更新)

> **更新: DR-047 により required の充足判定は「最終状態の値の有無 (default 込み)」に変更。値源の優先順位・source 記録・committed と値の直交性は引き続き有効。**

元記述: 「`required` 制約は committed を見る — default で埋まっただけでは required を満たさない。」
