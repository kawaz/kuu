# DR-050: config ファイル値源 — type: config_file の配線、provider 契約、config_key の同型対応

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-029 (config ファイル値源の注入機構、critical)。F-032 (source: "config" が立つ条件) の片翼も確定する。本セッションの議論で確定。

## 決定

### 1. type: "config_file" — 配線宣言のプリセット

config ファイルのパスを取る要素に `type: "config_file"` を付けると、config installer との結合が定義だけで完結する:

```json
{"name": "config", "type": "config_file", "long": [], "env": "MYAPP_CONFIG", "default": "~/.myapp.toml"}
```

- パス要素は**普通の要素**であり、long / short / env / default がそのまま乗る。パス自体が値源ラダー (CLI > env > default、DR-031 / DR-049) で解決される
- 「**type プリセット = 装置との配線宣言**」パターンの 2 例目 (1 例目は type: "help" の失敗時アクション同梱、DR-048)

### 2. config_provider の契約

- registry 区分 `config_provider` は単一スロット。シグネチャ:

  ```
  config_provider: (path: string) → 階層オブジェクト (JSON 同型の値) | null
  ```

- **フォーマット (TOML / YAML / JSON)・探索ルール・複数ファイルのマージ戦略は provider の関心**。kuu core はフォーマットを知らず、JSON 同型の階層オブジェクトだけを見る。デフォルト実装のフォーマット選定は言語 DX の関心
- null = 読めない (ファイル不在等)。挙動はパスの committed で分かれる: **committed なパス (CLI / env 明示) の読込失敗は Error** (指定したのに読めないのは失敗)、**default 由来のパスの不在は黙認** (設定ファイルはオプショナルという慣習。config 席が空になるだけ)
- 階層帰属は標準 (デフォルト同梱・opt-out 可、DR-010)。env_provider (コア) と違いファイル I/O を伴うため

### 3. config_key — 同型対応デフォルト + 明示上書き

- **デフォルトは同型対応**: 結果オブジェクトの構造 (name スコープの階層) と config の階層をそのまま対応させる (`serve.port` ↔ config の `serve.port`)。appconfig 統合ストア (DR-030 — 結果オブジェクトが設定の最終形) と噛み合う「結果と同じ形」の 1 規則
- **明示 `config_key` で上書き**: link の固定パス DSL (DR-029: `.name` / `[int]`) を流用する。解決起点は**config ファイルのルートからの絶対パス** (相対起点の曖昧さを持たない — 相対の役割はデフォルトの同型対応が既に担う)
- 「未指定なら name 構造から導出、明示で上書き」は DR-046 の「name は各軸のデフォルト供給源」パターンの config key 軸への適用

### 4. config 値の型は要素の type が決める

config 値の期待型は独立の仕様ではなく、config_key を持つ**要素の `type:` がそのまま期待型**である。JSON 同型の値種ごとの通し方:

- **string** → CLI / env と完全に同一の全段 pipeline (pre_filters → parse → post_filters、DR-034 / DR-049)
- **非 string (number / bool) で型一致** → post_filters のみ。pre_filters / parse は String → 型の関数なので、既に型を持つ値には適用対象が無い — スキップは特別規則ではなく型の帰結
- **int 要素** (整数制約付き数値、DESIGN §3.3): int は **値空間判定** (DR-075、updated)。JSON string は整数「値」を parse 受理 (`"3.0"`→3 / `"1e3"`→1000、整数構文に限らない)、真に fractional な値 (`"2.5"`) は `int_round` に従う (canonical default `error` で reason `not_an_integer`)。JSON native number も同ポリシー — 整数値なら受理、非整数 (`1.5`) は int_round に従う。ただし native number は **JSON が既に binary64 化した値**が来る (ECMA-404 は整数/小数を区別せず元の 10 進は復元不能) ため整数判定は原理的に binary64 ベースで、DR-075 §5 の「String 源は binary64 非経由の厳密判定」要件の保証対象外 (native number は整数値制限で fractional 露出が最小)。「string 源は厳密 / native-number 源は JSON 由来 binary64」の非対称を採る
- **JSON null** → 供給なし (provider lookup が値を返さないのと同義)。null という値は要素に流れない (DR-051)
- **寛容は双方向対称** (canonical = 言語中立で再現可能な実用寛容字句、DR-074 §6。狭めたい場合は方言 / pre_filter):
  - number / bool 要素に JSON string (`"8080"` 等) → parse を試みて受理 (テキストから型へ)
  - **string 要素に JSON scalar (number / bool) → JSON 文字列化で受理** (`1.5` → `"1.5"`、`true` → `"true"`)。string 要素は CLI / env では「何でも受ける」型であり、config でも同じ観測になる (引用符の有無で挙動が割れない)
  - 数値の文字列化は **JSON serialize の最短表現** (整数値は小数点なし: `1.0` → `"1"`)。JSON number は整数と浮動小数を区別しない (ECMA-404) ため元の表記は保持できず、常に `.0` を付ける規則は整数 `8080` を `"8080.0"` にしてしまう — 最短形が唯一の一貫解 (slice PoC 第 10 弾の flag で確定。Python 系 serializer の `"1.0"` とは異なるので conformance の比較点)
- **意味の飛躍は Error**: bool ↔ number の相互変換 (`true` → 1 等) はしない
- **array** → multiple 要素の**分割済み pieces** として accumulator へ (separator は CLI の 1 引数を分割する機構であり、config では登場しない)
- **object** → name スコープとの同型対応で子要素へ再帰 (§3 のデフォルト対応と一体)
- **構造不一致は Error**: array / object を scalar 要素へ、scalar を object 期待 (name スコープ) へ — いずれも DR-037 の **Error** (この値源のつもりだが値が不正)

### 5. 依存順序 (完走後パイプライン) と不変条件

```
経路確定 (path-search) → config_file 要素の値確定 (CLI/env/default)
  → provider 読込 → config 席の有効化 → 全要素の最終値確定 → 遅延述語 (DR-047)
```

- **config は構造に影響しない (値源に徹する)**: config は matcher・トリガ・経路探索に関与しない。これが「経路探索は config なしで完走できる」(= 上記パイプラインが成立する) を保証する不変条件。config で alias や構造を定義する用途は明示的にスコープ外
- **循環禁止**: config_file 要素自身は config 席を持てない (パスを config ファイルから取ることはできない)。静的検査の対象
- config installer は席宣言型 (DR-042 不変則④): `config_key` / `type: "config_file"` を回収し、config 席に lookup を宣言する。lookup は `(value, source: "config")` を返す — **F-032 の「source: "config" が立つ条件」はこれで確定**

### 6. DR-014 の config フィールドとは別物 (名前の注意)

要素の `config` フィールド (DR-014: long_prefix / auto_env 等の階層継承設定) と、本 DR の config ファイル値源は**別物**である。要素側の参照フィールドを `config_key` (`config` ではなく) とするのはこの衝突の回避でもある (F-029 の指摘)。

## 採用しなかった案

### kuu core がフォーマット別 parser を持つ

TOML / YAML parser を core に入れるとフォーマット追加のたびに core が肥大し、tree-shake も効かない。provider の関心に逃がす。

### config_key のスコープ相対解決

デフォルトの同型対応が既に「スコープなり」の対応を担っている。明示 config_key まで相対にすると明示の意味 (どこを指すか) が読み手に自明でなくなる。絶対パスに固定。

### config 値を全て文字列化して pieceProcessor に流す

型付きの値を文字列化して再パースする迂回は情報を落とす (数値精度、将来の datetime 等)。型の帰結としての自然なスキップ (§4) で足りる。

### 定義と別体のマッピングテーブル (config_keys 対応表)

対応を要素から引き離すと定義の局所性が壊れる。要素に書く (配置で決まる、§0.1 の暗黙ルール最小化)。

## 射程外

- 複数の config_file 要素の合成 (システム設定 + ユーザ設定の 2 要素等) は本 DR では確定しない。canonical は単一の config_file 要素
- config ファイルの watch / 実行時再読込
- プロファイル切替 (F-034) — DESIGN §12 の射程外方針のまま

## 関連

- DR-031 (値源ラダーの config 席 — 本 DR がその供給機構)
- DR-042 (installer 不変則④ — 席宣言型。canonical セット表の「将来の候補」から確定へ)
- DR-049 (env lookup — 対称の値源。パス要素の env 解決も同契約)
- DR-029 (link の固定パス DSL — config_key の明示形が流用)
- DR-046 (デフォルト供給源パターン — config key 軸)
- DR-030 (appconfig 統合ストア — 同型対応の動機)
- DR-074 (実用寛容 canonical 字句 — string→parse 受理) / DR-040 (type registry 方言 3 層)
- DR-075 (int の値空間判定 + int_round — §4 の int-parse を構文判定から値空間判定へ改訂、native-number→int の binary64 由来を明記)
- DR-037 (Error — 型不一致・committed パス読込失敗)
- DR-047 (遅延述語 — config 充填後の最終状態に対して評価)
- DR-048 (type プリセット = 配線宣言パターンの 1 例目)
- DR-014 (config フィールド — 別物、名前の注意 §6)
- findings `2026-06-29-ast-missing-pieces.md` F-029 (解消) / F-032 (source: "config" 条件の確定、残りは DR-031 拡張) / F-034 (射程外)
