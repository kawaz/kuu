# DR-096: option 表面 config の軸別再編 — long_eq_sep / short_attached_value の enum 化

corpus 拡充で見つけた表現ギャップ 1 件から、config ダイヤル 2 本の enum 化・命名対称化・
副次的な導出裁定 3 連へと広がった 1 日サイクルを記録する。

## 発端: gcc corpus で見つかった attach-only の表現ギャップ

corpus/real-cli/gcc.json (`short_combine:false` の実機文法プローブ) 作成中、macOS 実機で
`clang` の short オプションごとの値供給形の差を確認した (2026-07-12): `-O 2` / `-W all` の
space-form は `exit 1` で拒否される一方、`-I /usr/include` / `-l m` は `exit 0` で受理される
(`e02ac125b5ec`)。kuu の現行 spec (DR-041 の値スロット一般規則) は値持ち short 全てに
space-form の読みを一様に許すため、この per-option な attach-only 制約を表現する config
ダイヤルが無かった。gcc.json では該当 case を明示除外し (誤った期待値を固定しないため)、
issue `short-opt-attach-only-space-form` として起票した (`17e6076c7744`)。

kawaz が issue を精読し、「long の `long_eq_sep` (eq 必須/両方/eq 禁止) と対称なダイヤルが
short に無い欠け」と整理。加えて `long_prefix`/`short_prefix` のみが `long_`/`short_` 接頭を
持ち `allow_equal_separator`/`require_equal_separator`/`short_combine` が接頭なしという
命名非対称も未解消だったため、まとめて軸別再編する裁定を下した。

## DR-096 起票: bool 2 キー → 3 値 enum の統合

`allow_equal_separator` + `require_equal_separator` (2 bool) を `long_eq_sep`
(`"require"｜"allow"｜"deny"`) に統合、新設 `short_attached_value` (同型 3 値) で
per-option attach-only を要素単位 config override (DR-049 §4 と同機構) で表現する
(`d8fbc3c14f2f` DR 起票、`518fab9be296` DESIGN §7.2 更新)。

enum 統合の本質的な利点は illegal states unrepresentable: 旧 2 bool 表現では
`require_equal_separator:true` かつ `allow_equal_separator:false` という組が構文上書けてしまい
long の入口 (eq 形・space 形) を同時に全滅させる静的矛盾になっていた。3 値 enum では
「eq 必須」「両方許可」「eq 禁止」の 3 状態しか存在せず、矛盾する組合せがそもそも表現不能になる。
これにより旧来の矛盾検出 definition-error 規定と、それを固定していた fixture
(`fixtures/definition-error/config-eq-separator-conflict.json`) は削除できた — 退行ではなく
再編の本質的な副産物。

fixtures/schema/corpus の追従 (`4542268b4aa6` 語彙リネーム + 輪郭 pin + 矛盾 fixture 削除、
`513335bf9285` gcc corpus の attach-only を要素 override で表現) を経て issue を close
(`8e17619f230f`)。

## codex レビュー: クラスタ末尾の space 借用が未規定

codex レビューで Major 指摘: `short_attached_value` の scope が「クラスタ末尾 entry が
次トークンから space-form で値を借用できるか」を明文化していなかった。これは DR-041 §4 の
値スロット一般規則がクラスタ末尾にもそのまま及ぶという導出のはずだが、従来どの fixture にも
固定されていない暗黙規則だった。§3.1 に明文化 + fixture 3 case (`-abp 80` allow 側、
`-abq 80` require 側で借用ブロック等) を追加した (`d6c764102bb7`)。

## kawaz 裁定の連鎖 (spec を読みながらの指摘 3 連)

kawaz が DR-096 を通読しながら、以下の順で 3 つの指摘・裁定を下した。

### a. 空 prefix の合法条件の先回り禁止を撤廃

`long_prefix:""` の旧合法条件 (DR-091 §3「`long_eq_sep:"require"` との併用時のみ合法」) を
撤廃。当初メイン側は「衝突は Ambiguous に落ちるので併用条件は緩めてよい」という Ambiguous 帰結で
一度着地させたが (`de6a86fbb4bd`)、これは誤りだった。正しくは DR-041 の先食い規定 (トリガとして
読めるトークンには positional 素通し枝が立たない、option 優先) が決定的に解決する — bare long
と operand が衝突しても Ambiguous にはならず、option 側が確定的に勝つ。`long_prefix:""` は
`long_eq_sep` の値に依らず無条件に合法、が最終形 (`31f951d3a6e4`)。

この訂正は kuu.mbt 実装側から独立に裏取りされた: 実装 worker が `suppressed()`
(`src/core/eval.mbt` — DR-041 §4 の greedy raw-eat 抑制関数、「あるトークンを greedy entry が
読むなら raw-eat は抑制される」の実体) を調べる過程で同じ結論に到達し、Ambiguous ではなく
先食いで決定的に解決することを確認して報告してきた。テスト側を Ambiguous 期待のまま通す方向へ
改変せず、実装の調査結果を優先して spec 側を訂正した形になった。

### b. クラスタ末尾の位置条件という framing 自体の誤り

「クラスタ末尾付着は生きる (§3.1 旧稿)」という書き方は、ダイヤルが「クラスタ内の位置」を条件に
しているかのように読める framing だったが、これも誤り。`short_attached_value` がダイヤルする
のは当該 entry の値取得 2 形 (付着/space) の読み生成だけであり、単独発火かクラスタ内か・
クラスタ内のどの位置かは条件にならない。space 形がクラスタ文脈で現れるのは「クラスタ読みが
当該 entry でトークン末尾に達した」場合に限られるが、これは space 形が定義上「次トークンから
値を取る」形であることの帰結であって位置条件ではない、と§3.1 を書き直した (`31f951d3a6e4`)。

### c. GNU getopt strict 再現のための `last_only` 新設

`short_attached_value` に4値目 `"last_only"` を新設。付着読みを「当該 entry がトークンの残り
全部を丸取りする形」だけに制限し (付着の分割点を列挙しない)、GNU getopt 慣習
(`tar -xzffile` 型、クラスタ走査が値オプションに達したら以降の文字列全部がその値) の strict
再現を可能にする。この制限は読み生成規則そのものの話なので定義構造 (型・filter) では充足でき
ず、config ダイヤルとして提供する必要がある、という判断 (`31f951d3a6e4`)。

3 つの裁定を 1 コミットにまとめ、DESIGN.md / DR-096 / DR-091 の相互参照注記 / INDEX.md /
fixtures (`long-empty-prefix-operand-collision.json` の先食い解決への書き換え、
`short-attached-value.json` への last_only 輪郭 pin) を同時更新した (`31f951d3a6e4`)。

## stop hook (codex gate) の取りこぼし検出 2 件

セッション終盤、stop 時の codex gate が追随漏れを 2 件検出した:

- `docs/decisions/INDEX.md` の DR-096 概要行が旧 3 値のまま残っていた (last_only 追加後の
  4 値化に追随していなかった)
- `schema/wire.schema.json` の `short_attached_value` enum が `"require"/"allow"/"deny"` の
  3 値のままで `"last_only"` が抜けていた

前者は `31f951d3a6e4` 内で修正済みだったが、後者は同コミットの対象漏れとして残っており、
別コミットで追随した (`eb2efb732c6a`)。この種の「schema ↔ docs 双方向網羅漏れ」は、構想中の
REFERENCE.md + lint-reference (schema と docs の双方向網羅検査) があれば機械検出できる類の
実例だった。

## kuu.mbt 側の実装追従

spec の 3 コミット (`f07935f1` 軸別再編の基本実装、`ae30734d` kawaz 裁定第2弾 — 空 prefix
無条件合法化 + `AtLastOnly` 追加) に対応する実装を反映し、CI の spec fixtures pin を最終 SHA
`eb2efb73` へ更新した (`b6915b91`)。`a7ce415a` では DR-096 コメント中の旧キー名
(`allow_equal_separator`/`require_equal_separator`) への history narrative を current 専用の
説明へ整理した — no-historical-noise の適用例。`ae30734d` では `long_prefix:""` の合法条件
撤廃に伴い、事前チェックだけを行っていた `validate_scope_config` がチェック内容ゼロになったため
関数ごと削除し、呼び出し3箇所と reject 系 wbtest 3 件も削除、無条件合法化を固定する新テストに
差し替えた。

## 最終状態

spec main `eb2efb73`、kuu.mbt main `f586fa02`。conformance decoded=197 / ran_cases=524 /
skipped=0 / mismatches=0、moon test 304 本、CI green。

## commit 系譜

spec: `17e6076c7744` (issue 起票) → `d8fbc3c14f2f` (DR-096 起票) → `d6c764102bb7`
(codex レビュー反映、クラスタ末尾 space 借用明文化) → `de6a86fbb4bd` (空 prefix 合法条件撤廃、
Ambiguous 帰結) → `31f951d3a6e4` (kawaz 裁定 3 連 — 先食い解決への訂正 + 位置条件除去 +
last_only 新設) → `eb2efb732c6a` (wire.schema last_only 追随)。

kuu.mbt: `f07935f1` (軸別再編の基本実装) → `a7ce415a` (旧キー名 narrative 整理) →
`ae30734d` (kawaz 裁定第2弾実装) → `b6915b91` (spec fixtures pin bump)。

## 関連

- DR-096 (`docs/decisions/DR-096-scope-config-axis-reorganization.md`)
- DR-091 §3 (bare key=value operand の段階表現 — 空 prefix 合法条件は本サイクルで撤廃)
- DR-041 §4/§5 (値スロット一般規則・先食い規定 — 本サイクルの訂正の根拠)
- DR-049 §4 (要素単位 config override — `short_attached_value` の per-option 適用の先行例)
- issue `short-opt-attach-only-space-form` (本サイクルで解消、archive 済み)
- 前回 journal: `2026-07-12-dr093-095-required-ns-schema.md`
