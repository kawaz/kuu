# DR-096: option 表面 config の軸別再編 — long_eq_sep / short_attached_value の enum 化

> 由来: issue `2026-07-12-short-opt-attach-only-space-form` (gcc/clang 実機検証で `-O 2` / `-W all` が exit 1 拒否される一方 `-I /usr/include` / `-l m` は受理される per-option 差を発見、DR-041 の値スロット一般規則は short 値持ち全てに space-form の読みを一様に許すため表現不能と報告)。加えて `long_prefix` / `short_prefix` のみが `long_` / `short_` 接頭を持ち `allow_equal_separator` / `require_equal_separator` / `short_combine` が接頭なしという命名非対称も未解消だった。kawaz 裁定 (2026-07-12) による確定。

## 決定

scope config の option 表面ダイヤルを軸ごと (`long_` / `short_`) に再編し、bool ペアを 3 値 enum に統合する:

```json
{
  "config": {
    "long_prefix": "--",
    "long_eq_sep": "allow",
    "short_prefix": "-",
    "short_attached_value": "allow",
    "short_combine": true
  }
}
```

| キー | 型 | 既定 | 旧キー |
|---|---|---|---|
| `long_prefix` | string | `"--"` | (不変) |
| `long_eq_sep` | `"require"｜"allow"｜"deny"` | `"allow"` | `allow_equal_separator` + `require_equal_separator` (2 bool) を統合置換 |
| `short_prefix` | string | `"-"` | (不変) |
| `short_attached_value` | `"require"｜"allow"｜"deny"｜"last_only"` | `"allow"` | 新設 — DESIGN §7.2 (旧稿) の `short_combine` 段落にあった「値付着の制限は別の方言パラメータの管掌 (DR-041)」という予約スロットの実体化 |
| `short_combine` | bool | `true` | (不変) |

### 1. `long_eq_sep` — 旧 2 bool ペアの 3 値統合

対応関係:

- `long_eq_sep: "require"` = 旧 `require_equal_separator: true` — long は eq 分割形 (`key=value`) のみ受理、別引数での値供給 (`key value`) を拒否
- `long_eq_sep: "allow"` (既定) = 旧デフォルト (`allow_equal_separator: true` かつ `require_equal_separator: false`) — eq 形・space 形の両方を受理
- `long_eq_sep: "deny"` = 旧 `allow_equal_separator: false` — eq 分割 matcher を生成しない、space 形のみ受理

**enum 統合の設計意図**: 旧 2 bool 表現では `require_equal_separator: true` かつ `allow_equal_separator: false` という組が構文上書けてしまい、long の入口 (eq 形・space 形) を同時に全滅させる静的矛盾になっていた (旧 DESIGN §7.2、DR-083 §5 の筋で definition-error 扱い)。3 値 enum では「eq 必須」「両方許可」「eq 禁止」の 3 状態しか存在せず、矛盾する組合せがそもそも構文的に表現不能になる (illegal states unrepresentable)。これにより旧来の矛盾検出規定と、それを固定していた definition-error fixture (`fixtures/definition-error/config-eq-separator-conflict.json`) は**削除**する — 本再編の本質的な利点であり、退行ではない。

`long_prefix: ""` (空 prefix) は**無条件に合法** (kawaz 裁定 2026-07-12、DR-091 §3 の合法条件を撤廃)。bare な名前一致トリガ (`height 168.5` のような prefix なし long) が素の operand と衝突しうるかはアプリ毎の事情であり、衝突は DR-041 の先食い規定が決定的に解決する — トリガとして読めるトークンには positional 素通し枝が立たず option 側が食う (`prog -v src` で `src="-v"` の読みが立たないのと同じ規則)。リテラルを positional に渡したい場合は dd (`--`) を使う。破綻でも未定義動作でもない。`long_eq_sep: "require"` は衝突を定義側で排除したい開発者への解決手段の一つ (eq 必須なら `=` を含むトークンだけが long 候補になり素の operand と衝突しない、DR-091 §3 の機構) であって、合法性の前提条件ではない。「想定ケースで困るから」の先回り禁止は置かない — DR-041 §5 の prefix ガード非採用 (typo の positional 化受容) と同じ設計態度。

### 2. `short_attached_value` — per-option attach-only/space-only の新規表現力

意味論:

- `short_attached_value: "require"` — 値持ち short は付着形 (`-O2`) のみ受理、space 形 (`-O 2`) の読み枝が立たない。付着形は定義上 1 文字以上の残り文字列を要求する (0 文字の付着は形として存在しない — 空付着を認めると単独トークンが space 形の入口と区別不能になり 2 形モデル (§3.4) が壊れる)。したがって "require" 下で残り文字ゼロの単独トークン (`-q` 等) は当該 entry への完全経路を持たず、DR-041 §5 (prefix ガード非採用) により素通しで positional に落ちる
- `short_attached_value: "allow"` (既定) — 現行挙動、付着形・space 形の両方を受理 (DR-041 §4 の値スロット一般規則そのまま)
- `short_attached_value: "deny"` — 付着読みの枝が立たない、space 形のみ受理
- `short_attached_value: "last_only"` — 付着読みを「当該 entry がトークンの残り全部を丸取りする形」だけに制限する (付着の分割点を列挙しない)。GNU getopt 慣習 (クラスタ走査が値オプションに達したら以降の文字列全部がその値、`tar -xzffile` 型) の strict 再現で、`-sax` 型の分割 ambiguity (`cluster-split-string.json`) がこの entry には立たない。space 形は "allow" と同じく生きる。この制限は読み生成規則そのものの話なので定義構造 (型・filter) では充足できず、config ダイヤルとして提供する必要がある (kawaz 裁定 2026-07-12)

実例根拠: gcc/clang 実機観測 (macOS, 2026-07-12) で `-O 2` / `-W all` (space-form 値供給) は `exit 1` (`clang: error: no such file or directory: '2'/'all'`) で拒否される一方、`-I /usr/include` / `-l m` は `exit 0` で受理される。この per-option 差は要素単位 config override (DR-049 §4 の `env_prefix: ""` と同機構) で表現する — scope 既定を `"allow"` のまま、`optimize` / `warning` 要素だけ `config: {"short_attached_value": "require"}` を持たせる。

### 3. 導出裁定 (既存規定からの導出、新規規則の追加ではない)

#### 3.1 クラスタ読みとの関係 — 位置は条件にならない

`short_attached_value` がダイヤルするのは当該 entry の値取得 2 形 (付着 / space) の**読み生成だけ**であり、単独発火かクラスタ内か・クラスタ内のどの位置か、は条件にならない (kawaz 裁定 2026-07-12 — 「クラスタ末尾でだけ生きる / 死ぬ」のような位置規定は存在しない):

- `"deny"`: 当該 entry の付着読み (単独 `-p80` も、クラスタ読みの任意の分割点に現れる付着も、DR-041 §3 の列挙全て) を生成しない。space 形は生きる
- `"require"`: 当該 entry の space 形読み (単独 `-p 80` も、クラスタ読みが当該 entry でトークン末尾に達した時の次トークン借用 `-abp 80` も) を生成しない。付着読みは分割点の列挙も含めて全て生きる — `-q80ab` (a/b が flag、q が require) は q の付着分割 3 通りが完全経路になり従来どおり ambiguous (`cluster-split-string.json` と同じ DR-038/DR-053 の帰結)
- `"last_only"`: 付着読みのうち丸取り形だけを生成する (§2)。space 形は生きる

space 形がクラスタ文脈で現れるのは「クラスタ読みが当該 entry でトークン末尾に達した」場合に限られるが、これは space 形が定義上「次トークンから値を取る」形であること (DR-041 §4) の帰結であって、本ダイヤルの位置条件ではない。値取得の 2 形モデルは発火文脈に依存しない (getopt 系の実世界慣行 `-abo arg` とも一致)。この次トークン借用は従来どの fixture にも固定されていない暗黙規則だったため、本 DR で明文化する。

#### 3.2 値なし要素 (flag / count) への適用

ダイヤルは値スロットを持つ要素だけが参照する。scope config は混成集団 (値持ち要素と値なし要素が同一 scope に同居) に継承されるのが常態 (`env_prefix` と同型、DR-049 §4)。値なし要素にダイヤルが届いても inert (エラーにしない) — 意味論上参照する対象を持たないパラメータが無視されるのは他の config キーと同じ扱い。値持ち要素と値なし要素が意味論的に矛盾する組合せ (あれば) の検査は warn/lint の領分 (DESIGN §16「制約間の意味矛盾は warn に置く」既定)。

#### 3.3 `long_prefix: ""` の合法条件の撤廃

旧 DR-091 §3 の「`require_equal_separator: true` との併用時のみ合法」条件を**撤廃**し、`long_prefix: ""` は `long_eq_sep` の値に依らず無条件に合法とする (kawaz 裁定 2026-07-12、§1 参照)。operand と option 名の衝突は definition-error でも未定義動作でもなく、DR-041 の先食い規定が決定的に解決する — トリガとして読めるトークンに positional 素通し枝は立たない (option が勝つ)。リテラル渡しの正規手段は dd (`--`)。fixture `matcher-readings/long-empty-prefix.json` (bare long の成立形) と `matcher-readings/long-empty-prefix-operand-collision.json` (衝突トークンの先食い解決) で固定する。

#### 3.4 short の eq 形は存在しない

kuu の short は付着形 / space 形の 2 形モデルであり (DR-041 §5「short combine」の matcher 記述)、long の eq-split (`--key=value`) に相当する eq 区切り形は short に存在しない。`short_attached_value` はこの 2 形の間のダイヤルであり、long の `long_eq_sep` (eq 形 vs space 形) とは軸そのものが異なる — 本 DR の射程外として明記する。

## 採用しなかった案

### 形容詞混在の enum 値 (`required` / `optional` / `forbidden` 等)

`long_eq_sep` / `short_attached_value` の両方を動詞形 (`require` / `allow` / `deny`) で統一する。片方が形容詞、片方が動詞になる命名の不統一を避ける (kawaz 裁定)。

### 旧 2 bool キーとの互換 alias

v1 前の破壊的変更として単純リネームする。互換 alias は持たない — 旧キー名は spec 全域から消す (DR-068 のドラフト期方針、破壊的変更の障害なし)。

### space 形ダイヤルと付着分割ダイヤルの 2 キー分離

意味論上 `short_attached_value` は {space 形: 可/不可} × {付着: 全分割列挙 / 丸取りのみ / なし} の 2 軸に分解できるが、現時点で実例のない組合せ (「丸取りのみ + space 禁止」) のためにキーを増やさない。enum は open (v1 前) なので実例が出たら値を足せる。単一キー 4 値 (kawaz スケッチどおり)。

### `short_attached_value` を `short_combine` の値に統合 (enum で兼務)

`short_combine` (クラスタの可否) と `short_attached_value` (値付着の可否) は直交する軸 (DR-041 §5「値付着制限は short_combine と独立な別方言パラメータ」、`fixtures/matcher-readings/short-combine-off.json` の `value-attach-full-tail` case が既に固定済み)。1 つの enum に畳むと「クラスタ可・付着不可」のような直交な組合せが表現できなくなるため、2 キーのまま独立に保つ。

## 波及

- DESIGN.md §7.2: config 例示 JSON・`long_eq_sep` / `short_attached_value` の規定段落を新設、旧 `allow_equal_separator` / `require_equal_separator` の規定段落・矛盾 definition-error 段落を置換
- schema/wire.schema.json: config properties の旧 2 キーを新 2 キーへ置換
- fixtures: `fixtures/value-sources/require-equal-separator.json` → `long-eq-sep-require.json` へリネーム + 語彙更新、`fixtures/definition-error/config-eq-separator-conflict.json` は削除、`fixtures/matcher-readings/` に `short_attached_value` の輪郭 fixture を新設
- corpus/real-cli/grep.json・dd.json: 旧キー名を新語彙へ更新。gcc.json: `optimize` / `warning` 要素に要素単位 override `{"short_attached_value": "require"}` を付け、issue が報告していた表現ギャップを実体化する

## 関連

- DR-091 (`require_equal_separator` の導入 — 命名は本 DR で `long_eq_sep` へ置換。同 §3 の「空 prefix は eq 必須併用時のみ合法」条件は本 DR §3.3 で撤廃)
- DR-014 (config フィールドの階層継承集約 — `allow_equal_separator` / `short_combine` の初出、本 DR は同じ集約先で軸別再編)
- DR-041 (token reading semantics — §4 値スロット一般規則、§5 prefix ガード非採用、short combine の matcher 記述が `short_attached_value` の直接根拠)
- DR-049 (env lookup contract — §4 要素単位 config override の先行例、`short_attached_value` の per-option 適用と同機構)
- DR-083 (definition-error の判定原則 — 「静的に既知の不整合は definition-error」の筋、旧矛盾規定の根拠だったが本 DR で対象自体が消える)
- issue `2026-07-12-short-opt-attach-only-space-form` (本 DR で解消)
