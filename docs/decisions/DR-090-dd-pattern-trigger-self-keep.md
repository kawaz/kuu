# DR-090: dd の一般化 — pattern トリガと自己保持 splice (末尾 raw pass-through)

> 由来: issue corpus-implicit-trailing-passthrough (xargs/ssh/docker/env の「positional 充足以降は子コマンドのもの」が表現できない)。kawaz 提案 (2026-07-11): 「greedy な dd のマッチャーとして exact ではなく正規表現を書けて、かつそのノード自身の引数消費は 0 で Accept して自身含めて以降をポジショナルに流す、みたいなのが書けると良い」「dd トリガは regex で良い。方言が関係するほど複雑な条件が来るとは思えない」。

## 決定

### 1. dd 要素を 2 軸で一般化する

| 軸 | 既存 dd (`--`) | 本 DR の拡張 |
|---|---|---|
| トリガ形 | exact (name 綴りの完全一致) | **pattern** (正規表現、`match` 属性) |
| マーカー自身の扱い | 消費 1・捨てる (severed 化のみ残る) | **自己保持** (`self: "keep"` — 消費 0 で Accept、自身を含めて以降が positional 域へ) |

severed 化の効果本体 (発火以降 greedy 面 off = 全トークンが raw、DR-064 §4 の重複合流もそのまま) は不変。組合せは自由だが、canonical な用途は (exact, drop) = 従来 dd と (pattern, keep) = xargs 型の 2 つ。

### 2. wire 形

```json
{"type": "dd"}                                  // 従来: exact "--"、self は drop (既定)
{"type": "dd", "match": "^-", "self": "keep"}   // xargs 型: option 風の未知トークンで発火、
                                                //   そのトークン自身から positional 域
```

- `match`: 正規表現。照合方言は host 実装準拠 (DR-085 §2 と同じ宣言)。トリガが構文解釈を左右するが、実用パターン (`^-` 等) に方言差は出ない — 複雑な条件が必要になる見込みは薄い (kawaz 裁定)。`match` があるとき name はトリガ綴りに使われず、要素の同一性・表示軸のみに効く (DR-046)
- `self`: `"drop"` (既定 — マーカーを消費して捨てる、従来 dd) | `"keep"` (消費 0 で Accept し、判定基準となったトークン自身を含めて以降を positional 域へ流す)

### 3. pattern dd は「最後の受け皿」— 既知の読みに常に負ける

pattern トリガの dd は、**当該トークンを他のいかなる読み (option 発火・値スロット消費・positional 席の消費・exact dd) も採用しない場合にのみ**発火する。つまり「unknown token でエラーになるはずだった経路を正規に受け止める」劣後の衛星であり、既知読みとの競合を ambiguous にしない (DR-086 の cut と同系の、経路空間に投入される読みを絞る局所選好)。

- 例 (xargs): `xargs -n 1 rm -f a` — `-n` は xargs 自身の option として発火 (pattern dd は負ける)、`1` はその値スロットへ、`rm` は utility positional が消費、`-f` はどの読みも取れない → pattern dd (`^-`) が発火し `-f a` が positional 域へ
- exact dd (`--`) は従来どおり通常の greedy 衛星として振る舞う (本節の劣後は pattern トリガのみの規則)

### 4. env との合成

env (`FOO=bar cmd -x`) のような前置代入 + command 形は、代入 operand の表現 (別 DR: key=value) と本 DR の合成で書ける。本 DR 単体の管掌は「どこから先が丸ごと raw か」の宣言のみ。

## 採用しなかった案

### positional 席への属性 (severs_trailing: true — 「この席の確定直後から severed」)

positional の意味論に越境の関心を混ぜる。dd 族の衛星として増設すれば、severed 化の効果・重複合流・宣言配置 (DR-064) の既存規定をそのまま継承でき、positional 側は無傷で済む。

### 弱いパターン語彙 (glob / prefix 一致) の新設

regex より安全に見えるが、専用語彙の発明コストに見合わない。実用トリガは単純で方言差が出ず、regex_match (DR-085) と同じ host 準拠宣言で足りる (kawaz 裁定)。

## 波及

- fixtures: xargs 型の輪郭 (既知 option が勝つ / 未知 `-f` で発火・自己保持 / 発火後は全 raw)、exact dd の従来挙動不変の対照。corpus/real-cli の xargs / ssh / docker を本形で書き直し (env は key=value DR とセットで)
- kuu.mbt: dd installer の match / self 属性対応 (対 issue 起票)
- DESIGN / LOWERING の dd 節: 2 軸の注記

## 関連

- DR-064 (dd の宣言配置・severed 効果・重複合流 — 本 DR はその一般化) / DR-041 §4 (greedy 面と raw) / DR-085 §2 (regex の host 方言準拠) / DR-086 (経路空間を絞る局所選好の先行例) / DR-046 (name の多軸)
- issue corpus-implicit-trailing-passthrough (経緯)
