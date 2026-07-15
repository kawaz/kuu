# 2026-07-15 小粒 issue 掃除サイクル (4 件並列調査+裁定+実装)

午後、溜まっていた小粒 issue 4 件を一括で片付けたサイクル。Workflow (4 並列
sonnet5-worker-high 調査、632k tokens) → 統括精読・裁定 → 実装委譲
(mbt-writer) + fixture 委譲 (spec-writer) の 3 段構成で回した。

## 処理した issue と裁定

### 1. kuu.mbt `audit-node-nodashstr-deprmark-variants`

`NoDashStr` と `DeprMark` の 2 系統を監査した issue。裁定は分岐した:

- **`NoDashStr`**: 廃止済み残骸と裁定し削除 (kuu.mbt commit `0804258a`)。
  DR-041 §5 が dash-reject を `pre_filter` opt-in 方言と確定済みで、構築箇所
  ゼロ・fixture 要求もゼロだった
- **`DeprMark`**: 実装漏れと裁定し long installer lowering を実装 (kuu.mbt
  commit `d38b8b2f`)。short 側 (`ShortEntry.depr`) は対称実装済みだったが
  long 側のみ欠落していた。spec に
  `fixtures/alias-parse/long-deprecated.json` を追加して pin

同じ監査対象でも一方は削除・一方は実装追随という逆方向の裁定になった点が
retreat-is-last-resort ルール的な順序 (実装漏れをまず疑う) の実例になっている。

### 2. kuu.mbt `audit-held-path-rooted-escape`

`close (not-applicable)`。DR-066 §4 の規範は「発火時の動的パス」を対象と
しており、現実装 (`Held` 経路 = コピー先 scope 基準) は仕様通りでズレは
無かった。`complete()` 内部の `Cand.link` escape は別の内部実装が持つ意味論
で、`Held` とは無関係。実機実証 (`KUU_FIXTURES` 注入で `path=["a"]` を確認)
まで行って確定させた。

派生発見として、`Pending → ParseError` 変換経路の `path` 非対称に気づき、
kuu.mbt 側に新 issue `pending-parseerror-path-asymmetry` を起票した。

### 3. spec `lowering-generated-element-origin-rule`

`close` ではなく縮小して open 継続。未定義だった 4 断面のうち 3 断面は
実は「実装は既に一貫挙動で、未文書化なだけ」と判明:

- global 越し = 宣言元の canonical 名
- repeat 内部 id は origin に出現しない
- A.1 匿名 exact = spelling 自身

この 3 断面を DR-104 §2 の明確化 note で確定し、
`fixtures/complete/repeat-internal-id-origin.json` /
`anonymous-exact-origin.json` の 2 本で pin した。残りスコープは ref
template (DR-078) 越しの trigger/value origin 非対称のみで、こちらは実需
fixture 待ちとして issue 本文を書き換えて継続。

### 4. spec `custom-type-candidate-ty-representation`

`close (resolved)`。`candidate.ty` = 基底 primitive 解決、で確定 (DR-104
§2 の明確化 note)。設計根拠は 3 点: `ty` は生成器向けの閉じた語彙である
こと、custom 型名 (open set) は生成器に解釈の当てが無いこと、custom 固有
の補完は completer 側の関心分離であること。schema 変更は不要と判定した。

## 副次発見 → 同サイクルで穴埋め

上記 3 の `anonymous-exact-origin.json` を conformance に流したところ
UNEXPECTED SKIP が発生し、`dec_positional` が `exact` キー単独を decode
できない実装漏れが発覚した。schema (`$defs.node` は positional 位置での
`exact` 単独を合法としている) と DR-018/041/063 の意味論から裁定し、
既存の `is_dd` と対称の carrier パターン (`is_exact`) で実装 (kuu.mbt
commit `a2d3f619`)。既存 `Exact` node の意味論への配線のみで、新規意味論の
追加ではない。

## 結果

conformance: decoded=267→270 / ran_cases=649→655 / skipped=0 / mismatches=0、
`moon test` 332→337 全 green。ロックステップ push で spec main
`21dcca55d07f` → kuu.mbt `ci.yml` pin bump → kuu.mbt main `aa12e250578d`。

## ハマり所

並行 worker (spec-writer が fixture 追加、mbt-writer が conformance 実行)
の交錯で、mbt-writer が fresh test を回したところ「自分の変更と無関係な
UNEXPECTED SKIP」に遭遇した。worker はここで自己判断で握りつぶさず正しく
切り分けて報告し、統括裁定で実装漏れと確定する流れが機能した
(worker-model-selection ルールの「指示と仕様が矛盾したら黙って進めず報告」
規約通りの動き)。

## 関連

- `docs/decisions/DR-104-completion-fixture-format.md` (§2/§3 明確化 note)
- `docs/decisions/DR-041-*.md` (dash-reject の pre_filter opt-in 方言)
- `docs/decisions/DR-066-*.md` (§4 動的パス規範)
- `docs/decisions/DR-018-*.md` / `DR-063-*.md` (positional exact の意味論)
- `docs/issue/2026-07-14-lowering-generated-element-origin-rule.md`
  (縮小継続)
- kuu.mbt 側 `docs/issue/2026-07-15-pending-parseerror-path-asymmetry.md`
  (新規起票)
