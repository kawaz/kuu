# 値カプセル一新の受け入れ検証 — 発題照合ウォークスルー (移送前ゲート)

> 目的: kawaz 発題 (カプセルノート §1 mid=1、mid=66「**type 追加したいだけなのに registry が
> 複雑に絡んで大変すぎる、の解決が目的**」) と棚卸しの実在問題 (O-2/O-3/O-4/O-9) に対し、
> DR-139/140 の新モデルが達成しているかを before (現行 wire) / after (新 wire) の完全な
> 定義例併記で検証する。**ヨイショ禁止** — 悪化・現状維持・未詰めは §9 に正直に列挙する。
> 非正本。例の規範根拠は DR-139/140 と生存 DR 群。

---

## 1. 単純な型追加 — uint8 (int + 丸め + 範囲)

### before (現行)

```jsonc
{"definitions": {"types": {
   "uint8": {"name": "int", "config": {"int_round": "error"}}}},   // factory 参照形
 "options": [
   {"name": "level", "long": true, "type": "uint8",
    "value_filters": ["in_range:0:255"]}]}                          // ← 使用側に毎回
```

- **range を型に載せる正式な機械可読形が無い** (O-4 — type 既定 filter chain は散文のみ)。
  `in_range` は使用側の各要素へ毎回書く
- 事前知識: definitions.types と registry の解決順 (DR-035) / factory config は型でなく
  factory の語彙 (`int_round` は int factory のキー — REFERENCE §3.3) / 座席 4 属性から
  `value_filters` を選ぶ判断 (per piece vs 確定後の argv_pos 差 — DR-102 §4 を知らないと
  `final_filters` との違いが分からない)

### after (DR-139/140)

```jsonc
{"definitions": {"types": {
   "uint8": {"type": "int", "post_type_filters": ["in_range:0:255"]}}},  // カプセル断片プリセット
 "options": [
   {"name": "level", "long": true, "value": "uint8"}]}
```

- 型の全構成 (parse + 検証) が **1 箇所**に載り、使用側は `"value": "uint8"` の 1 token。
  O-4 (既定 chain の散文性) が機械可読宣言で解ける
- 事前知識: カプセル field 名 (アンカー明示なので `post_type_filters` = 「parse の後、
  piece ごと」が名前から読める) + 「type プリセット = カプセル断片」の 1 概念

**判定: 改善**。書く場所 2 → 1、座席選択の判断が名前の自己記述で支えられる。
registry との関係: uint8 が使う `in_range` は wire の chain から名前参照される共有語彙
なので registry 住人のまま (これは正当 — §7)。一方、uint8 **専用**の検証をホスト言語で
書き足す場合、現行は filters registry への ns 付き登録 (descriptor 起草込み) が唯一の口 —
型に閉じた検証に共有語彙の管理コストを払わされる形で、§7 の縮小候補そのもの。
**ただし未詰めを 1 件発見** (§9-1): definitions.types エントリの canonical 形 — 現行の
factory 参照形 `{"name": "int", "config": {...}}` とカプセル断片形
`{"type": "int", "post_type_filters": [...]}` の統合 (`int_round` をカプセル断片の中で
どう書くか — `"type": {"name": "int", "config": {...}}` の入れ子か) が DR-139/140 に明文が
無い。上の after 例は config なしの形でしか書けていない。

## 2. 制限付き再利用 — uint8 を ref して 0:100 に狭める

### before

```jsonc
{"name": "percent", "long": true, "ref": "level",
 "value_filters": {"append": ["in_range:0:100"]}}     // DR-062 の {prepend,append}
```

### after

```jsonc
{"name": "percent", "long": true, "ref": "level",
 "value": {"post_type_filters": {"append": ["in_range:0:100"]}}}
```

- 合成の意味論は完全に同じ (DR-062 の二形が field 単位で効く — DR-139 §4)。字面は
  カプセル 1 段分だけ深い
- after の利得は ref 合成そのものでなく**継承元の可視性** — before は ref 元の
  `value_filters` がどこで何を継承するか散文知識 (DR-062 §3 の解決順) だったのに対し、
  after は ref 元のカプセルという 1 オブジェクトの field 単位追記として読める

**判定: 微改善** (意味論同等、入れ子税 1 段 vs 継承の可読性)。

## 3. 構造化 union 型 — color (tuple | string)

### before

**型として表現不能** — union の out 宣言 (DR-126) も tuple (DR-137) も descriptor の
value_type 体系であり、しかも DR-137/138 以前は tuple 自体が無かった。近い形は消費の or
(`or: [{seq: [r,g,b]}, {name: "colorname"}]`) だが、これは結果が row object になる別物で、
`--r 0` のような位置書き合流 (link) は書けなかった。

### after — 型作者側

```jsonc
// registry descriptor (types 区分) — wire ではない
{"name": "myapp/color", "role": "type_parser",
 "io_type": {"input": "string",
             "output": [{"tuple": ["int", "int", "int"]}, "string"]}, ...}
```

### after — 使用側

```jsonc
{"options": [
  {"name": "color", "long": true, "value": "myapp/color"},
  {"name": "r", "long": true, "value": "int", "link": "color[0]"},
  {"name": "g", "long": true, "value": "int", "link": "color[1]"},
  {"name": "b", "long": true, "value": "int", "link": "color[2]"}]}
```

**判定: 使用側は新規獲得** (表現不能 → 4 行 + 淘汰意味論 DR-138 が全部面倒を見る)。
**型作者側は registry 依存が残る** — union / record / tuple の out 宣言は descriptor の
領分のまま (DR-126 §1「解決は registry 空間のみ」) で、wire の definitions.types からは
書けない。parser 実装も要る (input_structure 定義片だけの無 parser 型は書けるが descriptor
起草自体は必須)。発題の「registry が複雑に絡む」は**構造化型の新設についてはまだ残る**
(§9-2)。

## 4. 組み込み shadow 再定義 — `_` 区切り許容 number をグローバルに

### before

```jsonc
{"definitions": {"types": {
   "number": {"name": "number", "config": {"number_thousand_sep": ["_", ","]}}}}}
```

**これは現行でも既に書ける** (DR-035 の definitions → registry 解決順 — bare `"number"`
参照は定義全体で shadow に落ちる)。

### after

同じ形 (カプセル断片形になる点は §9-1 の未詰めと同じ)。

### scope config との対応表

mid=64-65 の洞察の実測: **number 系の scope config キーは現状存在しない**。scope config の
実在 7 キー (REFERENCE §4) の内訳:

| キー | 系 | shadow 置換の対象か |
|---|---|---|
| `long_prefix` / `long_eq_sep` / `short_prefix` / `short_attached_value` / `short_combine` | 入口綴り面 | 対象外 (値の作られ方でなく照合面 — カプセル外のまま) |
| `env_prefix` / `env_auto` | 供給宣言面 | **defaults 注入 installer (DR-139 §1.1) と同族** — auto 系の再定式が既に済んでいる |

つまり洞察の実質は「**number 系ダイヤルを scope config へ追加せずに済む**」(将来の語彙増殖の
予防) であり、既存キーの削減ではない。型挙動のグローバル変更は shadow 1 本に寄せられる —
type プリセットが filter / 供給も持てるようになった (DR-139) ことで shadow の表現力は
現行より広い。詳細検討は issue `2026-08-16-scope-config-shrink-by-type-shadow`。

**判定: 現状維持 + 予防的改善** (新設語彙を折り返せる構造ができた)。

## 5. 拡張 provider — vault から default 供給

### before

```jsonc
{"name": "token", "long": true, "type": "string",
 "env": "APP_TOKEN", "default_fn": "vault:secret/app_token"}
```

`vault:` fn は cell_fns registry の拡張 ns descriptor が必要 (現行も同じ)。
**試行順は固定** — env が vault より必ず先 (DR-031)。vault を先に試す構成は表現不能。

### after

```jsonc
{"name": "token", "long": true,
 "value": {"type": "string",
           "defaults": ["vault:secret/app_token", "env:APP_TOKEN"]}}   // vault が先
```

**判定: 改善**。descriptor が要る点は不変だが、(a) 供給の口が defaults 配列 1 個に
統一され env / config / 拡張 fn が同じ文法で並ぶ、(b) **試行順が書ける**のは新表現力
(DR-031 の固定順では不可能だった)。糖衣 (env: / default_fn:) も残るので既存の書き方の
学習は無駄にならない。
registry との関係: `vault:` は **wire (defaults 配列) から名前参照される**ので descriptor
必須の側が正当 (§7 — owns による unknown-vocab 判定と ns 衝突管理が効く場所)。ただし
descriptor の中身は縮小余地がある — defaults 要素の fn に必要な宣言は owns / source タグの
名乗り / reasons (Reject するなら) 程度で、io_type や output_mode の全軸が要るかは §7 の
見取り図の対象。

## 6. multiple 全部入り — header 例

### before

```jsonc
{"name": "header", "long": true, "type": "string",
 "env": "APP_HEADERS", "config_key": ["headers"], "default": [],
 "completer": "header_names",
 "piece_filters": ["trim"], "value_filters": ["non_empty"],
 "accum_filters": ["unique"],
 "multiple": {"accumulator": "append", "separator": ","}}
```

- 読み順が属性順序と無関係 (wire の属性順序に意味が無い)。`separator` が multiple の中・
  `piece_filters` が外という配置は時系列と一致しない (O-2)。`accum_filters` を使うには
  「multiple/repeat/separator のどれかがあるか」の適格判定 (DR-102 §1) を知る必要がある

### after

```jsonc
{"name": "header", "long": true,
 "value": {
   "defaults": ["env:APP_HEADERS", "config:headers", {"value": []}],
   "completer": "header_names",
   "separator": ",",
   "pre_type_filters": ["trim"], "type": "string", "post_type_filters": ["non_empty"],
   "post_accum_filters": ["unique"],
   "accumulator": "append"}}
```

- **行数はほぼ同じ** (10 行前後 → 9 行前後)。改善は行数でなく判断の消滅: (a) 束ね名
  `multiple` の中か外かの判断が消えた、(b) 座席の選択が「時系列のどこに効かせたいか」を
  アンカー名 (`pre_type` / `post_type` / `post_accum`) で書くだけになった、(c) accum 適格は
  「収集座を書いたか」そのもの (一方向導出 — DR-139 §2.1)

**判定: 改善** (O-2 解消)。ただし `final_filters` と `post_accum_filters` の使い分け
(非 accum / accum の排他 — DR-102 の属性分割) は**残る知識**である (§9-3)。

## 7. registry の存在意義の再確認 — 何のために要り、どこを縮小できるか

発題の「registry の煩雑さも減らせるのでは」(mid=1) の直接検証。descriptor / registry が
担っている目的を分解し、**型ローカルの filter** (型定義の中でだけ使う変換・検証) に各目的が
適用されるかを判定する:

| 目的 | 出典 | wire から名前参照される filter | 型に閉じた filter |
|---|---|---|---|
| 共有語彙の衝突管理 (ns) | DR-094 | 要る (共有プールの衝突が実在) | **不要** — DR-094 自身が「ns が扱うのは registry 側の共有語彙プールの衝突のみ」と明言。型の中に衝突空間が無い |
| unknown-vocab 判定 (owns) | DR-061 / DR-102 §2 | 要る (使用側の typo 検出) | **不要** — wire に綴りが現れないものは判定対象にならない。型定義内の typo は型作者の実装エラー (定義時に自分で気づく) |
| reasons の完備チェック | DR-061 / DR-066 | 要る (観測面に自名で出る) | **不要にできる** — 内部失敗を**型自身の reason に畳む先例が既にある** (fixture/int_range が構成部の int 失敗を `not_an_int_range` に畳む — DR-132 §2)。型に閉じた filter の Reject は型の reason として観測させれば、内部 filter は観測面に自名で出ない |
| help / lint の機械可読性 (io_type / fallibility / output_mode) | DR-107 / DR-113 | 価値あり (使用側 chain の説明・静的検査) | **不要** — help に出るのは型の out (value_structure 射影、DR-128 §9)。内部構成は射影されない |
| 型同一性の保証 | DR-126 §1 | — | **無関係** — 同一性は out (名乗り) の話で、内部実装の詳細は同一性に寄与しない |

**帰結: descriptor / registry が本当に必要なのは「wire から名前で参照される共有語彙」だけ**
である。そしてこの境界線は実は新設ではない — **DR-107 §1「descriptor 体系は宣言される
registry 住人を対象とし、評価器内部の実装装置は対象外」が既に引いた線**であり、value_parser
の内部処理が descriptor を持たないのと同じ位置づけに「型登録時にローカルに渡される filter」
を置けばよい (登録 API がグローバル registry 経由を強制しない形 — ホスト言語 API の設計)。

### 縮小の見取り図

| 機構 | 判定 |
|---|---|
| DR-094 (ns) / DR-061 (owns — DR-139 でパス化済み) | **必要最小として生存** — wire 参照語彙の管理はカプセル化後も変わらず要る |
| descriptor の reasons 軸 | wire 参照 + Reject しうる住人に限定。**型ローカル filter は型の reason へ畳む** (DR-132 先例の一般化 — 規範化するなら 1 行の追補で足りる) |
| descriptor の io_type / output_mode / fallibility 軸 | wire 参照 filter には lint / help 価値が残る。型ローカルには不要 (DR-107 §1 の線) |
| 「filter を書く = registry 登録」という運用 | **縮小候補の本丸** — 型に閉じた filter の登録口 (type 登録 API のローカル引数) を用意すれば、descriptor 起草・ns 命名・REFERENCE 掲載の一式が不要になる。機構の変更ではなく**適用の明確化** (DR-107 §1 の適用範囲を型ローカル装置へ広げる 1 裁定) で足りる |
| DR-132 (fixture ns) / DR-102 (1 属性 1 registry) | 不変 — 前者は conformance の口、後者は wire 参照側の判定規律 |

**registry を「消す」のではなく「wire 参照語彙の管理」に純化する** — 発題の「registry の
煩雑さ」の実体は機構でなく「何でも registry に載せる」強制であり、そこは 1 裁定 (型ローカル
装置の descriptor 対象外化 — DR-107 §1 の適用明確化) で外せる。

## 8. O-2 / O-3 / O-4 / O-9 の判定表

| 問題 (棚卸し §8) | 内容 | 判定 |
|---|---|---|
| **O-2** | 座席と装置の対応が 1対多 / 多対1 / 1対1 の混在 (`multiple` 束ね名) | **解消** — 装置は時点順の独立 field (§6)。束ね名と multiple registry ごと廃止 (DR-139 §5) |
| **O-3** | accum 有無で属性名が変わる (`final_filters` / `accum_filters`) | **意図的存置** — 型が違う (T→T / array→array) ものを同名にしない裁定 (DR-102、SPL-Q6「違うものを違うものとして扱え」) は生きており、名前が変わること自体は仕様。新命名 (`final` / `post_accum`) で「何が違うか」は読みやすくなったが、使い分け知識は残る |
| **O-4** | type→parser 対応と type 既定 filter chain が散文のみ | **解消** — type プリセット = カプセル断片が機械可読 (§1)。ただし §9-1 の未詰めが残る |
| **O-9** | filterChain の二形 (`array` / `{prepend,append}`) + 呼び出し 3 表記 (colon-string / array / object) | **現状維持** — DR-062 / DESIGN §8.4 は不変。二形は継承合成に必要 (DR-139 §4 が defaults にも同じイディオムを広げたので、むしろ適用範囲は増えた)。表記の多様性は減っていない |

## 9. 残る複雑さの正直な列挙

1. **definitions.types エントリの canonical 形が未詰め (移送前に直すべき綻び)** —
   現行の factory 参照形 `{"name": "<factory>", "config": {...}}` と新のカプセル断片形
   (`{"type": ..., "post_type_filters": [...]}`) の統合が DR-139/140 に明文が無い。
   factory config 付きのカプセル断片 (§1 の uint8 に `int_round` を足す形) が書けることを
   確認できる規範が要る — 候補は `"type": {"name": "int", "config": {...}}` (type field の
   string | object 二形)。**DR-140 への 1 節追加 (または DR-139 §1.2 の type field 型の
   精密化) を移送前に推奨**
2. **構造化型 (union / record / tuple の out) の新設は descriptor の領分のまま** —
   wire だけでは書けず、parser 実装 (または input_structure 定義片) と registry 登録が要る。
   発題の「type 追加したいだけなのに registry が絡む」は、**スカラー型の派生 (§1/§2/§4) に
   ついては解けた**が、構造化型の新設については解けていない。これは DR-126 §1 の型同一性
   保証 (descriptor は使用側で意味が変わらない) との意図的なトレードオフであり、一新の
   失敗ではないが、発題の完全解決でもない
3. **`final_filters` / `post_accum_filters` の排他知識は残る** (O-3)。wrong-seat が
   definition-error で即発覚する (黙って無視されない) 点が救い
4. **defaults 配列は新概念** — ただし糖衣 4 綴りが残るため、学ばずに従来の書き方だけで
   完結できる (学習コストは opt-in)
5. **入れ子税** — type 1 個だけの要素は縮退形 (`"value": "number"`) で 1 token 差に抑えた
   が、`const` だけの実体ノードは `{"const": ...}` の 1 段が必ず付く (旧 `value: 30` より
   1 段深い)。移送時の旧 string const との縮退衝突リスク (DR-140 §2) も移送作業の複雑さ
   として存在する
6. **O-9 (表記多様性) は手つかず** — 別サイクルの検討対象として残る

## 10. 結論

**一新は成功と言える** — 発題の中核 (スカラー型の追加・派生・グローバル調整が「1 箇所に
カプセル断片を書く」だけになる、座席選択が名前の自己記述で足りる、multiple の束ね判断が
消える) は before/after で実際に達成されており、O-2 / O-4 は解消、O-3 は意図的存置、
O-9 は現状維持。悪化した箇所は無い (入れ子税は縮退形で相殺、行数はほぼ不変)。

**registry の煩雑さ (mid=1 のもう半分) は「純化の道筋が立った」段階** (§7) — 必須なのは
wire 参照語彙の管理だけで、型ローカル装置を descriptor 対象外に置く境界線は DR-107 §1 が
既に持っている。実際に煩雑さを減らすには「型ローカル filter の登録口」の 1 裁定
(適用の明確化) が要る — これは移送のブロッカーではなく、次サイクルの改善候補として
issue 化するのが適切。

**移送前に直すべき綻びは 1 件** — §9-1 (definitions.types エントリの canonical 形と
factory config の座)。ここが未規定のまま移送すると、既存 fixture の factory 参照形
(`bool-dialect-config.json` 等の definitions.types 使用分) の変換先が決められない。
DR-140 への追補 (type field の string | object 二形 — `{"name", "config"}` 呼び出し形) を
裁定 1 件 (軽 — 現行 definitions.types の形をカプセルの type field へそのまま持ち込むだけ
なので導出寄り) として先に片付けることを推奨する。§7 の型ローカル filter の 1 裁定は
移送のブロッカーではない (次サイクルの改善候補として issue 化を推奨)。

## 関連

- docs/research/2026-08-13-value-capsule-design.md §1 (発題) /
  docs/research/2026-08-12-device-vocabulary-inventory.md §8 (O-2/O-3/O-4/O-9)
- DR-139 / DR-140 (検証対象の規範)
- issue 2026-08-16-scope-config-shrink-by-type-shadow (§4 の詳細検討)
- docs/research/2026-08-16-value-capsule-migration-ledger.md (§9-1 が移送に効く箇所)
