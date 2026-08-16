# DR-031: 値源の優先順位

> **更新 (DR-139 §1.1、2026-08-16): 席順序の固定は部分 superseded。** canonical の宣言は
> 値カプセルの `defaults` 配列 (default provider fn の試行列 — 宣言順 = 試行順) になり、
> CLI/link 未満の並びは書ける。本 DR の固定順 (env > config > default) は**糖衣 4 綴り
> (`env:` / `config_key:` / `default:` / `default_fn:`) の既定展開順**として生存する。
> CLI/link が最上位であること・source 語彙 (7 語彙)・const の位相・追記 (UX-Q7R / EXP-Q1)
> は不変。

> **更新 (DR-130、2026-08-01): ラダーを回しても値が確定しない宣言座は成功 result で `null` になり、`sources` も同じ座に `null` を持つ。** 値源の優先順位と source タグ語彙は不変。null は「確定主体なし」を表し、値述語では不充足として扱う。

> **更新 (DR-120、2026-07-30): 共露出構造そのものが定義時に潰れたため、UX-Q7R / EXP-Q1 の追記 note は
> 対象を失った。** 1 結果スコープで同一露出キーへ解決する値セルが 2 つ以上ある定義は definition-error
> `export-key-collision` (DR-120 §1) であり、「複数実体の値が合流する結果 cell」も「共露出キーに異なる
> 宣言 default が並ぶ構造」も到達不能。単一実体では結果 cell と実体の値セルが一致するため、default 充填
> 判定を結果 cell 単位で行う規定は観測差を失う。DESIGN §15.6 の warn 項目も消えている (§15.5 が現行規範)。
> ラダーの優先順位が 1 実体の値セル内の規則であることは不変。

> **更新 (DR-125、2026-07-29): ラダーは 5 段から 4 段になった (`inherit` 席の削除)。** 現行順は
> CLI/link > env > config > default で、以下の順序表・共存規則・`source` 語彙 (7 語彙) に残る
> `inherit` の行と、`config > inherit` の根拠節は対象を失っている。祖先スコープの値を既定値に
> する定義は default 席の `default_fn: "borrow:<source>"` で書く (DR-125 §3、DESIGN §11.4)。

## 決定

1つの結果セルに複数の値源がつきうる。優先順位は以下で固定する (高→低):

```
1. CLI 明示 / link    パース時の操作 (今この実行で明示指定)
2. 環境変数            実行環境の指定
3. config ファイル     永続設定
4. inherit (祖先 scope) 上位スコープからの暗黙継承
5. default             最終フォールバック (充填。const = 宣言定数は席でなく初期値、下記「source の記録」)
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
source ∈ { cli, link, env, config, inherit, tty, default, const }
```

(`tty` は DR-098 §6 が観測席として追加したもの。序列は「明示 (cli/link/env/config) > 継承 (inherit) > 観測 (tty) > 宣言既定 (default)」)

(`const` は 2026-07-26 の kawaz 裁定で追加。**const は値セルに最初からいる。default は無い時に埋める** — 消費 0 literal (`value:`、DESIGN §5.2) は値源ラダーの充填ではなく、セル初期化位相に属す宣言由来の定数。ラダー席ではないので序列に参加しない (上位席が来ればあと勝ち/充填の通常規則で置き換わり、その時の source は勝った側)。発火に付随して現れる literal は「引数の静的写像 (`x → [x, "fallback"]`)」であり、default のような動的な値源 fn とは別物。**位置を問わない** (CONST-Q1=a、2026-07-26): root 位置の `value:` (DR-030 実体だけノード `{"name":"timeout","value":30}`) も or/seq の子位置の `value:` も同じ const — 冒頭ラダーの旧表記「5. default / value」は「5. default」となり、value は初期化位相へ移った (DESIGN §11.4 同時改訂)。const は席ではないので、上位席 (env / config 等) の供給や cli 効果は初期値を通常規則どおり上書きする。

**`default:` は const ではない — 位置に依らずラダー席である** (CHILDDEF-Q1=b、kawaz 裁定 2026-07-26): or/seq の子位置の `default:` も root 位置と同じく §1 の 5 段目の席であり、初期化位相ではない。子セルの席が成立するのは親が発火して子の座ができた場合のみで、未発火なら親ごと absent。default 席を持つ子は消費 0 literal にならず通常の消費を試みる — `default:` が与えるのは「トークンを得られなかった消費点を空席のまま完全経路に含めてよい」という静的充足判定 (DR-088 §1/§2) であり、空席で完走した座は resolve 相で default が埋めて source は `default` になる (DESIGN §5.2 同時改訂))

結果オブジェクトで「この値はどこから来たか」を引ける。appconfig ストア用途 (DR-030) で、値源を隠蔽しつつ必要なら由来を確認できる。

### source の確定ルール (境界条件)

source は「**最終値を確定させた効果 / 充填の由来**」であり、以下で一意に決まる:

- 自分の入口 (long/short/alias 等) からの効果 = `cli`、**link 越しの効果** (他要素の入口から link で飛んできた) = `link`。両者はラダー同順位で、区別は経路の違いのみ
- 席の充填 = その席の名 (`env` / `config` / `inherit` / `default`)。config が立つ条件は DR-050 (config 席の lookup 成功)
- **あと勝ち mutation 後は最後に勝った効果の source** (履歴は効果列 = 詳細モードの関心、DR-045)
- **effect op=default** (`--no-x` の "no:default"、committed=true) 適用後は `cli` — 値の内容が default 値と同じでも、その値を確定させたのはユーザの明示操作
- **effect op=unset** (committed=false) は「触っていないことにする」ので source を確定させない — その後に勝った席の充填の source になる (env が埋めれば `env`、最後まで無ければ `default`)
- **消費 0 literal (`value:`、位置を問わない) が置いた値 = `const`** — 宣言に書かれた定数がセルに最初から居るだけで、効果でも席の充填でもない。nameless 子の値が wrapper の結果アドレスへ畳まれる場合 (DR-121 §3)、wrapper セルを確定させたのは発火経路なので wrapper の source は `cli` (または `link`) — literal 成分は形の一部であり独立の由来を主張しない。named literal 子は自分の結果キーを持つので、そのセルの source が `const` になる

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
