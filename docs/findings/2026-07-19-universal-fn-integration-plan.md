# universal fn 統合の設計プラン — variant DSL effect + filter DSL + default_fn の 1 機構集約

> 由来: kawaz 発題 (mid=29)「long DSL の :区切り 2 個目以降の仕様って default_fn のデスクリプタと同じと言えるのでは? そう考えるとむしろ long に値源としての default_fn を持って来ることもできそう」+ HIP-META-Q8=A 裁定 (mid=32) の受け入れ + Q7-α+一本化 (mid=28+32) の完成形。
>
> 統括 (Opus 4.7) が起草、universal fn 機構を kuu の背骨に組み込む設計プラン。範囲精査 + 波及 + 実装コスト見積 + v1 スコープ判断を kawaz レビュー用に整理する。DR-113 修正 (or 新 DR-114 起草) の下敷き。

## 1. 統合の骨格 — kuu の背骨に fn 機構を立てる

### 1.1 現状の 3 種 DSL

現 kuu spec には表面的に類似した 3 種の DSL が並立している:

| DSL | 用途 | 場所 | 例 |
|---|---|---|---|
| **variant DSL** | 発火時 cell operation (effect 4 種 = set/default/unset/empty) | `long: [...]` / `short: [...]` の各要素 (DESIGN §7.3-7.4、DR-011) | `":set:X"` / `"no:set:false"` / `"red:set:rgb:255:0:0"` |
| **filter DSL** | 値の変換・検証 | `piece_filters` / `value_filters` / `final_filters` / `accum_filters` の各要素 (DESIGN §8.4) | `"trim"` / `"in_range:1:65535"` / `"regex_match:^[a-z]+$"` |
| **default_fn DSL** (HIP-META-Q6=A で新設、Q7-α で fn 名 `set` 統一) | default 席の値計算 | 要素の `default_fn: ...` 属性 (糖衣: `default: value` / `env: "VAR"` / `inherit: true`) | `"set:60"` / `"borrow:help-full"` / `"env:LOG_FILE"` |

3 種とも書式 (`"name[:arg...]"`) が同型、意味論も「fn 呼び出しで結果を得る」の点で近い。**統合可能性の設計プラン**を本 finding で示す。

### 1.2 統合案 — universal fn 機構

**universal fn = 「name で registry から fn 実体を引き、colon-args + SourceFnCtx を渡して呼び出し、結果を得る」の 1 種類の機構**。3 種の DSL は universal fn の specialization として位置づける:

| specialization | universal fn 呼び出しの解釈 | 結果の使い方 |
|---|---|---|
| **variant DSL** (発火時 cell operation) | 発火時に fn を呼び、返り値を cell operation として cell に適用 | set 系 = 値供給、default 系 = default 席参照、unset 系 = cell クリア、empty 系 = 配列/Map 空に |
| **filter DSL** (値の変換・検証) | 値を fn に渡し、変換後の値 or reject を得る | pipeline の各段で fn 適用 |
| **default_fn DSL** (default 席の値計算) | default 席で fn を呼び、結果を default 値として供給 | 値源ラダーの default 席 (DESIGN §11.4) |

### 1.3 統合のメリット (v1 完備主義準拠)

1. **DSL 集約**: 3 種の書式・意味論的重複を 1 種に統一、学習コスト減
2. **descriptor 集約**: 3 種の registry (variant effect / filter / default_fn) を統一 descriptor 群で扱える (DR-107 の直交軸を universal fn 用に拡張)
3. **DR-088 kawaz 裁定原文の完成形**: 「値源は全て default_fn」= universal fn の統合形
4. **kuu 背骨 (or/seq/repeat/link/ref) との整合**: 「機構を統一する思想」の延長
5. **3rd party 拡張の対称性**: サードパーティ fn が variant effect / filter / default_fn のいずれとしても使える (DR-094 namespace で名前空間分離)
6. **循環チェックの universal 化**: DR-087 遅延解決グラフに全 fn が乗る (SourceFnCtx.observes 軸で依存グラフ構築)

### 1.4 統合の懸念 (v1 スコープ判断の材料)

1. **範囲膨大**: variant DSL / filter DSL / default_fn の 3 機構を統合、DESIGN 4 節 / DR 5 本以上 / fixtures 大部分に波及
2. **実装 (kuu.mbt) の広範書き直し**: 3 種 DSL の parser / lowering / evaluator を統合機構に集約
3. **既存 wire form 記法の互換性**: 糖衣として維持する記法と、統合 DSL で新設される記法の混在
4. **descriptor 直交軸の拡張範囲**: DR-107 §3 の型体系 (現 "value" 近似) を拡張するか、統一 role の追加、observes 軸の追加

**v1 完備主義 (memoried) に沿えば今統合すべき**が、範囲を考慮した段階的な組み込み計画 (§4 で提示) を経て kawaz 最終裁定を仰ぐ。

## 2. 3 種 DSL の fn 化マッピング

### 2.1 variant DSL effect の fn 化

現 variant DSL (DESIGN §7.4 の effect 4 種):

| variant effect | 現形 | fn 化 (universal fn 呼び出し) |
|---|---|---|
| `set` (値なし) = 値スロット | `":set"` (主入口、値スロット) | 値スロット準備 = 発火時ユーザ引数を受けて fn を呼ぶ準備 (fn 呼び出しでなく「値供給待ち」の宣言) |
| `set` (1 個以上引数、固定値供給) | `"no:set:false"` / `"red:set:rgb:255:0:0"` | **`fn:"set"` を呼ぶ**、args = 引数配列。set fn は「渡された値をそのまま返す」= constant 同型 |
| `default` (default に戻す、committed=true) | `":default"` | **`fn:"default"` を呼ぶ**、default 席の default_fn を呼び出す (default 席参照) |
| `unset` (default に戻す、committed=false) | `":unset"` | **`fn:"unset"` を呼ぶ**、cell を unset に |
| `empty` (配列/Map を空に) | `":empty"` | **`fn:"empty"` を呼ぶ**、配列/Map を空に |

**帰結**: variant DSL の effect 部分は universal fn 呼び出しに集約。**`long: [":set:X"]` は `long: [":fn:set:X"]` の糖衣** (`:` の 2 個目が fn 名、それ以降が args) と読める。ただし DSL 書式は現行 `:set:X` のまま維持 (糖衣、破壊的でない)。

**発火時 cell operation**: fn の返り値を cell に書く形。set fn は value を返す → cell に set operation、default fn は default 席参照値を返す → cell に set operation (default 値で書く)、unset fn は sentinel を返す → cell に unset operation、empty fn は空配列/Map sentinel を返す → cell に empty operation。**fn 返り値の型 (Value / Sentinel) が cell operation の種類を決める**設計 (or fn descriptor の output_mode で明示的に区別)。

### 2.2 filter DSL の fn 化

現 filter DSL (DESIGN §8.4、4 属性: piece_filters / value_filters / final_filters / accum_filters):

| 現形 | fn 化 |
|---|---|
| `"trim"` | `fn:"trim"` を呼ぶ、args = []、pipeline 内で値を変換 |
| `"in_range:1:65535"` | `fn:"in_range"` を呼ぶ、args = ["1", "65535"] |
| `"regex_match:^[a-z]+$"` | `fn:"regex_match"` を呼ぶ、args = ["^[a-z]+$"] |

**帰結**: filter DSL は既に universal fn 呼び出しに近い形。「fn を pipeline の各段で適用」の意味論。DR-107 の `role: "filter"` 軸をそのまま universal fn の specialization として扱う (統合後は `role` に filter / default_fn / effect などが並ぶ、または `role: "fn"` に統一して `fn_kind` サブ軸で分ける)。

### 2.3 default_fn DSL の完成形

Q7-α+一本化 (mid=28+32) 確定の形:

| 糖衣 (wire form 不変) | universal fn 呼び出し |
|---|---|
| `default: value` | `default_fn: "set:<value>"` = `fn:"set"`, args=[value] |
| `env: "VAR"` | `default_fn: "env:VAR"` = `fn:"env"`, args=[VAR] |
| `inherit: true` | `default_fn: "inherit"` = `fn:"inherit"`, args=[] |
| `inherit: {"from": "other"}` | `default_fn: "inherit:other"` = `fn:"inherit"`, args=[other] |
| `default_fn: "fn:args"` (明示) | そのまま |

### 2.4 long DSL への default_fn 引き込み (kawaz mid=29 提案)

現 variant DSL は「long/short の入口宣言」に閉じている。kawaz 提案:

- `long: ["ttl:set:60"]` = 発火時に `fn:"set"`, args=["60"] を呼ぶ = 現 `":set:60"` と同型
- `long: ["ttl:env:TTL"]` = 発火時に `fn:"env"`, args=["TTL"] を呼び、結果を cell に set
- `long: ["ttl:borrow:other-ttl"]` = 発火時に他 option 値を borrow して cell に set

**帰結**: variant DSL の effect が universal fn になった段階で、long DSL は自動的に default_fn を発火時にも呼べる (「発火時 fn 呼び出し」= universal fn 統合の帰結)。**default_fn は「default 席で呼ぶ fn」だが、long DSL からも同じ fn を呼び出せる**。

これは「fn は呼び出し文脈 (default 席 / 発火時 / filter 段) を問わず同じ実体を再利用できる」の対称性で、kuu 背骨 (機構統一) と整合。

### 2.5 統合後の fn 呼び出し ABI (Q7-γ-45=b 反映)

全 fn は同一 ABI:

```
fn signature: (args: string[], ctx: SourceFnCtx) → Result<Value, Reason>

SourceFnCtx API:
- ctx.borrow_option(name) → Value | absent      // 他 option 値の遅延解決参照
- ctx.env(var) → string | null                    // 環境変数
- ctx.system(key) → any                           // system 提供 (git_branch / uuid_gen 等)
- ctx.filter_input() → Value                      // filter 段: pipeline の入力値
- ctx.effect_context() → EffectCtx                // 発火時 cell operation: cell / trigger 情報
```

**observes 軸** (descriptor 側で宣言、Q7-γ-45=b 承認):

```
observes: ["option:<name>", "env:<var>", "system:<key>", ...]
```

- 静的 name 参照 (constant/env/borrow with literal name) は observes 集合が確定 → 依存グラフ static 構築
- 動的 name 参照 (稀、runtime で name 決定) は observes に載らない → runtime エラー扱い
- 循環チェックは observes edge で構築、DR-087 の遅延解決 (位相順) に載せる、循環は definition-error kind = `circular-ref` (Q7-γ 4)

**次の commit で §3 descriptor 拡張 + §4 実装コスト見積 + v1 スコープ判断を書く** (context 節約のため分割)。

## 3. (次 commit で執筆) descriptor 直交軸の統合拡張

TBD:
- role enum の統合 (`role: "fn"` 統一 or `role: "filter"/"default_fn"/"variant_effect"` の並列)
- observes 軸の追加 (Q7-γ-45=b)
- construction / io_type / output_mode / fallibility / invocation の統一 fn への適用
- ジェネリクス T の必要性検討 (DR-107 §3 の型体系拡張)

## 4. (次 commit で執筆) 実装コスト見積 + v1 スコープ判断

TBD:
- kuu.mbt の変更範囲 (parser / lowering / evaluator)
- fixtures の書き直し範囲
- v1 完備主義に沿った「統合を今やる」vs 段階的組み込み (universal ABI だけ先行、DSL 集約は v2 に回す等) の judgment
- 統合実装のリスク (regression / migration path / 既存 fixture 追随)
