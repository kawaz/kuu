# DR-096: option 表面 config の軸別再編 — long_eq_sep / short_attached_value の 3 値 enum 化

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
| `short_attached_value` | `"require"｜"allow"｜"deny"` | `"allow"` | 新設 — DESIGN §7.2 (旧稿) の `short_combine` 段落にあった「値付着の制限は別の方言パラメータの管掌 (DR-041)」という予約スロットの実体化 |
| `short_combine` | bool | `true` | (不変) |

### 1. `long_eq_sep` — 旧 2 bool ペアの 3 値統合

対応関係:

- `long_eq_sep: "require"` = 旧 `require_equal_separator: true` — long は eq 分割形 (`key=value`) のみ受理、別引数での値供給 (`key value`) を拒否
- `long_eq_sep: "allow"` (既定) = 旧デフォルト (`allow_equal_separator: true` かつ `require_equal_separator: false`) — eq 形・space 形の両方を受理
- `long_eq_sep: "deny"` = 旧 `allow_equal_separator: false` — eq 分割 matcher を生成しない、space 形のみ受理

**enum 統合の設計意図**: 旧 2 bool 表現では `require_equal_separator: true` かつ `allow_equal_separator: false` という組が構文上書けてしまい、long の入口 (eq 形・space 形) を同時に全滅させる静的矛盾になっていた (旧 DESIGN §7.2、DR-083 §5 の筋で definition-error 扱い)。3 値 enum では「eq 必須」「両方許可」「eq 禁止」の 3 状態しか存在せず、矛盾する組合せがそもそも構文的に表現不能になる (illegal states unrepresentable)。これにより旧来の矛盾検出規定と、それを固定していた definition-error fixture (`fixtures/definition-error/config-eq-separator-conflict.json`) は**削除**する — 本再編の本質的な利点であり、退行ではない。

`long_prefix: ""` (空 prefix) の合法条件は「`long_eq_sep: "require"` との併用時のみ合法」に読み替える (意味論は不変、DR-091 §3)。eq 必須により「`=` を含むトークンだけが long 候補」になり、素の operand が long 経路と衝突しないことが空 prefix を破綻させない条件、という理屈そのものは維持される。なお単独の `long_prefix: ""` (`long_eq_sep` が `"allow"` / `"deny"` のまま) は DR-091 以来の未定義動作のまま — 本 DR の enum 化が表現不能にしたのは**同一キー内の矛盾** (旧 2 bool の同時全滅) であり、キー間の組合せ制約はこの enum 化の射程外として従来どおり残る。

### 2. `short_attached_value` — per-option attach-only/space-only の新規表現力

意味論:

- `short_attached_value: "require"` — 値持ち short は付着形 (`-O2`) のみ受理、space 形 (`-O 2`) の読み枝が立たない。付着形は定義上 1 文字以上の残り文字列を要求する (0 文字の付着は形として存在しない — 空付着を認めると単独トークンが space 形の入口と区別不能になり 2 形モデル (§3.4) が壊れる)。したがって "require" 下で残り文字ゼロの単独トークン (`-q` 等) は当該 entry への完全経路を持たず、DR-041 §5 (prefix ガード非採用) により素通しで positional に落ちる
- `short_attached_value: "allow"` (既定) — 現行挙動、付着形・space 形の両方を受理 (DR-041 §4 の値スロット一般規則そのまま)
- `short_attached_value: "deny"` — 付着読みの枝が立たない、space 形のみ受理

実例根拠: gcc/clang 実機観測 (macOS, 2026-07-12) で `-O 2` / `-W all` (space-form 値供給) は `exit 1` (`clang: error: no such file or directory: '2'/'all'`) で拒否される一方、`-I /usr/include` / `-l m` は `exit 0` で受理される。この per-option 差は要素単位 config override (DR-049 §4 の `env_prefix: ""` と同機構) で表現する — scope 既定を `"allow"` のまま、`optimize` / `warning` 要素だけ `config: {"short_attached_value": "require"}` を持たせる。

### 3. 導出裁定 (既存規定からの導出、新規規則の追加ではない)

#### 3.1 `"deny"` とクラスタ末尾付着の関係

`short_attached_value: "deny"` の scope では、クラスタ読みの末尾付着 (`-abp80` の `p` への `"80"` 付着) の枝も立たない。付着という機構自体をダイヤルしているのであって、単独発火時に限る規定ではない — `short_combine` (クラスタの可否) とは独立の軸だが、クラスタ内で最後に発火する値スロット entry も「付着で値を得る」という点では単独発火の付着と同じ機構を使うため、`"deny"` の管掌が及ぶ。

逆に `short_attached_value: "require"` ではクラスタ末尾付着は生きる (`-abp80` は OK、`-abp 80` の space 供給が死ぬ) — クラスタ内の最後の値持ち entry が付着で値を確定させることは "require" の許可範囲内。

クラスタ末尾の値スロット entry は、付着に加えて**次トークンからの space 分割形供給**も受けられる (`-abp 80` = `-ab` のクラスタ + `p` が `"80"` を space 形で取る)。これは単独発火の値スロット一般規則 (DR-041 §4) がクラスタ末尾にもそのまま及ぶという導出 — クラスタ末尾 entry も「発火した値持ち entry」であり、値取得の 2 形モデルは発火文脈に依存しない (getopt 系の実世界慣行 `-abo arg` とも一致)。従来この space 借用はどの fixture にも固定されていない暗黙規則だったため、本 DR で明文化する。`short_attached_value` は 3 値ともこの space 形を単独発火時と同一にダイヤルする: "allow" で借用可、"require" で借用不可 (付着のみ)、"deny" は space 形なので借用可。

#### 3.2 値なし要素 (flag / count) への適用

ダイヤルは値スロットを持つ要素だけが参照する。scope config は混成集団 (値持ち要素と値なし要素が同一 scope に同居) に継承されるのが常態 (`env_prefix` と同型、DR-049 §4)。値なし要素にダイヤルが届いても inert (エラーにしない) — 意味論上参照する対象を持たないパラメータが無視されるのは他の config キーと同じ扱い。値持ち要素と値なし要素が意味論的に矛盾する組合せ (あれば) の検査は warn/lint の領分 (DESIGN §16「制約間の意味矛盾は warn に置く」既定)。

#### 3.3 `long_prefix: ""` の合法条件

旧「`require_equal_separator: true` との併用時のみ合法」を「`long_eq_sep: "require"` との併用時のみ合法」に読み替える (§1 参照、意味論不変)。

#### 3.4 short の eq 形は存在しない

kuu の short は付着形 / space 形の 2 形モデルであり (DR-041 §5「short combine」の matcher 記述)、long の eq-split (`--key=value`) に相当する eq 区切り形は short に存在しない。`short_attached_value` はこの 2 形の間のダイヤルであり、long の `long_eq_sep` (eq 形 vs space 形) とは軸そのものが異なる — 本 DR の射程外として明記する。

## 採用しなかった案

### 形容詞混在の enum 値 (`required` / `optional` / `forbidden` 等)

`long_eq_sep` / `short_attached_value` の両方を動詞形 (`require` / `allow` / `deny`) で統一する。片方が形容詞、片方が動詞になる命名の不統一を避ける (kawaz 裁定)。

### 旧 2 bool キーとの互換 alias

v1 前の破壊的変更として単純リネームする。互換 alias は持たない — 旧キー名は spec 全域から消す (DR-068 のドラフト期方針、破壊的変更の障害なし)。

### `short_attached_value` を `short_combine` の値に統合 (3 値 enum で兼務)

`short_combine` (クラスタの可否) と `short_attached_value` (値付着の可否) は直交する軸 (DR-041 §5「値付着制限は short_combine と独立な別方言パラメータ」、`fixtures/matcher-readings/short-combine-off.json` の `value-attach-full-tail` case が既に固定済み)。1 つの enum に畳むと「クラスタ可・付着不可」のような直交な組合せが表現できなくなるため、2 キーのまま独立に保つ。

## 波及

- DESIGN.md §7.2: config 例示 JSON・`long_eq_sep` / `short_attached_value` の規定段落を新設、旧 `allow_equal_separator` / `require_equal_separator` の規定段落・矛盾 definition-error 段落を置換
- schema/wire.schema.json: config properties の旧 2 キーを新 2 キーへ置換
- fixtures: `fixtures/value-sources/require-equal-separator.json` → `long-eq-sep-require.json` へリネーム + 語彙更新、`fixtures/definition-error/config-eq-separator-conflict.json` は削除、`fixtures/matcher-readings/` に `short_attached_value` の輪郭 fixture を新設
- corpus/real-cli/grep.json・dd.json: 旧キー名を新語彙へ更新。gcc.json: `optimize` / `warning` 要素に要素単位 override `{"short_attached_value": "require"}` を付け、issue が報告していた表現ギャップを実体化する

## 関連

- DR-091 (`require_equal_separator` の導入 — 命名は本 DR で `long_eq_sep` へ置換、eq 必須の空 prefix long という意味論自体は不変)
- DR-014 (config フィールドの階層継承集約 — `allow_equal_separator` / `short_combine` の初出、本 DR は同じ集約先で軸別再編)
- DR-041 (token reading semantics — §4 値スロット一般規則、§5 prefix ガード非採用、short combine の matcher 記述が `short_attached_value` の直接根拠)
- DR-049 (env lookup contract — §4 要素単位 config override の先行例、`short_attached_value` の per-option 適用と同機構)
- DR-083 (definition-error の判定原則 — 「静的に既知の不整合は definition-error」の筋、旧矛盾規定の根拠だったが本 DR で対象自体が消える)
- issue `2026-07-12-short-opt-attach-only-space-form` (本 DR で解消)
