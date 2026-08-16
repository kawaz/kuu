# DR-140: 値カプセルの wire 射影 — 属性 `value` のフル入れ子 + type の string 縮退形、const 吸収、要素直下座席の廃止

> 由来: kawaz 裁定 AP-Q2=a / AP-Q6=a (2026-08-16)。属性平面の正本は DR-139、本 DR は
> その **wire 上の綴り** (どの属性名で、どう入れ子に書くか) に閉じる。
> **DR-030 の `value:` 属性 (実体だけノードの宣言定数) の綴りと、要素直下の座席 4 属性 +
> `multiple` を supersede する。** v1 前 (MDR-001) につき互換 alias は置かず一斉更新する
> (DR-079 §5 と同じ線)。

## 決定

### 1. カプセルの wire 属性名は `value` — フル入れ子 + type の string 縮退形

要素の値カプセル (DR-139 §1 の canonical 11 field。糖衣 4 を数え上げると 14 だが、糖衣はいずれも `defaults` へ展開されるので canonical は 11 — G-Q1、2026-08-16) は、要素直下の **`value` 属性 1 個**の下に
入れ子で書く:

```jsonc
{"name": "header", "long": true,
 "value": {
   "defaults": ["env:APP_HEADERS", "config:headers", {"value": []}],   // canonical (DR-139 §1.1)
   "completer": "header_names",
   "pre_type_filters": ["trim"], "type": "string", "post_type_filters": ["non_empty"],
   "post_accum_filters": ["unique"],
   "accumulator": "append", "separator": ","
 }}
```

供給の糖衣 4 属性 (`env:` / `config_key:` / `default:` / `default_fn:`) は**カプセル内の
糖衣キー**として残り、lowering が既定試行順で `defaults` へ展開する (DR-139 §1.1 —
`long: true` と同じ二形イディオム。糖衣と canonical `defaults` の同居時の合成も DR-139
§1.1 の配列イディオムで決まる)。

**string 縮退形**: `value` の値が string なら、それは `type` 単独指定の糖衣である —
`"value": "number"` = `"value": {"type": "number"}`。縮退はカプセル名の下で起きるので
要素直下の二形 (発題の「散らばり」の再生産) には当たらず、`type` だけを持つ要素
(fixture 実測で型付きノードの大半) の入れ子税が 1 token 差に縮む。string | object の二形は
確立イディオム (DR-011 / DR-062) の適用である。

**構造型式のインライン書きは不可** — union / record / tuple の value_type 式を wire の
`value` に直接書く形 (`"value": {"tuple": [...]}` 等) は持たない。構造型は
`definitions.types` (または registry) で**命名してから** `type` 参照で使う
(AP-Q6 裁定の確認事項、timerange 例で確認済み)。value_type 式の置き場は descriptor の
`io_type` 側 (DR-126 / DR-137) のままで、wire の `value.type` は常に registry 識別子の
string である — カプセル object の key 集合は DR-139 の field 名で閉じ、value_type の
タグ (`record` / `tuple` 等) と衝突しない。

### 2. `const` 吸収 — 旧 `value:` 属性の移動 (AP-Q2=a)

現行 wire の `value:` 属性 (消費 0 の宣言定数 — DR-030 の実体だけノード / or・seq 子位置の
literal、DR-031 の const) は、カプセル内 `const` field へ移る:

```jsonc
{"name": "timeout", "value": {"const": 30}}     // 旧 {"name": "timeout", "value": 30}
```

意味論は不変 (セル初期化位相・ラダー席でない・source は `const` — DR-031 の規定のまま)。
`values:` (or のショートハンド糖衣、DESIGN §5.3) は消費構造の糖衣であり無関係 — 綴りも
意味も変えない。

**移送の一意性は時点前提である** — 旧 `value:` には string const が多数実在し
(`{"name": "mode", "value": "cli"}` 等)、その綴りは新 wire では string 縮退形
(`type: "cli"` の糖衣) として**合法にパースされてしまう**。旧形と新形は型で区別できない。
機械変換が一意なのは「移送は全定義が旧綴りである時点に一括で行う」(v1 前の一斉更新、
本 DR 冒頭) という前提によるのであって、綴りの排他によるのではない。移送後に紛れ込む
旧形 string const の誤読 (存在しない type 名への縮退 → unknown-vocab で発覚するのが通常だが、
registry に実在する綴りと偶然一致すると沈黙する) は移送台帳の検知 lint / pin で塞ぐ。

### 3. 要素直下から廃止される属性

以下の要素直下属性は削除され、カプセル内の対応 field (DR-139 §1) に一本化される。
旧綴りは語彙層の一般規則 (DR-067 — 誰も所有しない語彙) により definition-error
`unknown-vocab` に落ちる。専用の移行診断は持たない (v1 前の一斉更新):

| 旧 (要素直下) | 新 (`value` 内) |
|---|---|
| `type` | `type` (または string 縮退形) |
| `piece_filters` | `pre_type_filters` |
| `value_filters` | `post_type_filters` |
| `final_filters` | `final_filters` (綴り不変) |
| `accum_filters` | `post_accum_filters` |
| `multiple` (束ね名 + object 形) | `separator` / `accumulator` / `collector` へ解体 (DR-139 §5) |
| `default` / `default_fn` / `env` / `config_key` | カプセル内の**糖衣キー**として同綴り存続 — canonical は `defaults` 配列へ lowering 展開 (DR-139 §1.1) |
| `completer` | 同名 field |
| `value` (宣言定数) | `const` (§2) |

要素直下に残る属性は DR-139 §1.1 の包含側列挙のとおり (名前系 5 軸・入口・構造・制約・
表示メタ・スコープ設定)。

### 4. 判別式の付け替え — 「type の不在」は「カプセルの不在」へ

- **グループ宣言 entry (DR-113 §8.1)**: 判別条件の「`type` を持たず」は
  「**`value` (カプセル) を持たず**」に置き換わる。schema/wire.schema.json の同旨条件も追随
- **DR-135 §1 / DR-130 §1b の「その要素が値を持つか」の分界**: **`value` の presence 単独
  では取れない** — `type: "none"` はカプセル語彙上「カプセル ⊘」(DR-139 §2.2) だが wire
  綴りとしては `"value": "none"` (縮退形) を持つ。正確な判別式は
  「**`value` が不在、または `value` の type が `"none"` である**」。none を wire 上も
  カプセル不在へ畳んで判別式を presence 単独に戻す案は issue
  `2026-08-16-type-none-as-capsule-absence` の別検討
- **実体だけノード (DR-030)** の判別 (「入口なしで値だけ持つ」) は上と同じ判別式で成立する
  (§2 の形)

### 5. lowered 断面 (DR-063 §3) は形を変えず語彙だけ追随する

lowered 断面の `entities` 表はフラットな最小投影のまま維持する — 断面は診断用の別射影で
あり、wire の入れ子をなぞる義務はない (DR-063 §3「最小投影フィールド名は仕様語彙を使う」
の「仕様語彙」が本 DR / DR-139 の語彙に更新されるだけ)。現行 lowering fixture に座席 filter
系の出現は無いため、追随の実差分は `multiple` 系エントリの綴りに限られる (移送台帳)。

## 根拠

### `value` が名前として最自然で、const 吸収が名前を空ける

カプセルは「この要素の**値**がどう作られるか」の宣言であり、利用者語彙 (interface-wording)
として `value` が最短で正確。従来この名を占有していた宣言定数は、平面上ではカプセルの
一 field (初期化位相) そのものなので、吸収は名前の付け替えでなく**構造の正置**である。
対極材料 (`values` との字面近接 — DR-079 が `typed_filters` を退けた理由の同型) は認識の上、
`values` は複数形の列挙糖衣・`value` は単数の宣言オブジェクトで実文脈の取り違えは低いと
裁定された (AP-Q2=a)。`cell` は kawaz 棄却済み (内部事情由来の名)、省略形は不可。

### 縮退形は二形問題を再生産しない

opus M2 が警告したのは「トップレベル `type:` 糖衣の温存」= 同じ宣言が要素直下とカプセル内の
2 か所に書ける形。string 縮退形はカプセル名の下の縮退であり、宣言の置き場は 1 か所のまま。

## 波及

- **schema/wire.schema.json**: 全面改稿 (§3 の廃止・`value` の string | object 二形・
  §4 の判別式)。移送サイクル側で実施 (本 DR の先行 land 可)
- **docs/REFERENCE.md** node-properties 表 / **DESIGN** §3.5・§5.2・§6・§8 /
  **PIPELINE** / **CONFORMANCE**: 同上 (移送台帳が正本)
- **DR-030 / DR-031**: `value:` 綴りの移動 (§2)。意味論 (消費 0・初期化位相・source const)
  は不変 (更新注記)
- **DR-113 §8.1 / DR-135 §1**: §4 の判別式付け替え (更新注記)
- **DR-063 §3**: §5 の語彙追随 (更新注記)
- **fixtures / corpus**: 全数移送 (移送台帳 `docs/research/2026-08-16-value-capsule-migration-ledger.md`)。
  座席入れ子化は expect 不変が実測済み、`multiple` 解体分の expect 不変は**移送時に実測して
  から主張する** (未実測)
- **kuu.mbt / kuu-cli**: decode・lowering・schema 追随 (lockstep 窓)

## 採用しなかった案

### 縮退なしの一律フル入れ子

型付きノードの全数に入れ子税がかかる (痛みは座席持ちの約 1 割に集中しているのに税は全体)。

### トップレベル `type:` 糖衣の温存

要素直下とカプセル内の二形になり、発題の「散らばり」を再生産する (opus M2)。

### フラット wire の維持 (平面はモデル層のみ)

wire 読者の「全体を見るのが大変」を解けない — 案 A の棄却 (カプセルノート §4.10) と同じ。

### 構造型式のインライン書き (`"value": {"tuple": [...]}`)

カプセル field の key 空間と value_type タグの key 空間が同じ object 上で衝突し、
「これはカプセルか型式か」の判別が key の綴り依存になる。命名参照 (definitions.types) は
型の同一性 (DR-126 §1 の registry 解決) とも整合する。

## 関連

- DR-139 (属性平面 — field と意味論の正本)
- DR-030 / DR-031 (実体だけノード・const — §2 の移動元)
- DR-113 §8.1 / DR-135 §1 (§4 の判別式)
- DR-063 §3 (lowered 断面 — §5)
- DR-067 (語彙層 — 旧綴りの unknown-vocab)
- DR-011 / DR-062 (string | object 二形の先行イディオム)
- docs/research/2026-08-16-attribute-plane-settlement.md §5 (判断材料)
- docs/research/2026-08-16-value-capsule-migration-ledger.md (移送台帳)
