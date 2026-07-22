# DR-078: definitions.templates — 共有消費文法の区分新設と、ref の参照実体は id という精密化

> 由来: 蒸留 1:1 audit の漏れ #1/#2 (slice phase4:114 / phase10:64) の fixture 化で、共有消費文法テンプレート (`or [3 数値 seq | string]` を複数要素から `ref`) の wire 上の置き場が spec に無いことが判明 (kuu.mbt issue ref-template-decode-missing)。DR-032 は「ref はスコープ内 → definitions テンプレ」と解決順を定めていたが、DR-035 が definitions の区分を registry と同じ 4 区分 (types/accumulators/filters/multiple) に限定したことでテンプレートの座席が構造上消えていた。kawaz 裁定 2026-07-09。

## 決定

### 1. definitions に `templates` 区分を新設する

```json
{
  "definitions": {
    "templates": {
      "color": {"or": [
        {"seq": [{"type": "number", "name": "r"}, {"type": "number", "name": "g"}, {"type": "number", "name": "b"}]},
        {"type": "string", "name": "colorname"}
      ]}
    }
  },
  "positionals": [
    {"name": "hlcolors", "ref": "color", "repeat": {"min": 1}}
  ]
}
```

- **templates = クロージャなしの構造 (枝持ち Node) に名前を振って使い回す場所**。types (クロージャを持つ名前付きパーサの座席 — AST ではクロージャは表現できない) との役割分担: 実体がクロージャである区分は registry を持ち、templates は純構造なので definitions 内で完結する
- 値は要素定義と同じ構造記法 (or / seq / 裸文字列等、LOWERING §A 群の糖衣がそのまま効く)。lowering はテンプレートを name → Node として registry (ref 解決空間) に植え、`ref` を持つ要素の消費文法が `Ref(name)` に差し替わる (kuu.mbt の ElemDef.ref_target / elem_head の既存経路)
- 解決順は DR-032 のまま: スコープ内 → definitions (templates)。不在は definition-error `absent-ref` (DR-054)

### 2. DR-035 の対称性の改訂

DR-035「definitions は registry と同じ区分の名前空間」に templates を加える。templates は**外部 registry を持たない唯一の区分**であり、これは例外ではなく本質: 他区分の definitions エントリは「registry のクロージャ実体への config 束縛・シャドー」だが、templates の実体は純構造なので束縛すべき外部実体が無い。「definitions = テンプレート/束縛を定義する場所」という語義に 2 単語合成 (definitions.templates) がそのまま一致する。

### 3. ref の参照実体は定義実体の内部 id (DR-032 の精密化)

`ref` / `link` / `alias` (参照ファミリー、DR-057) の wire 上の参照キーは name だが、**参照の実体は解決先の定義実体が持つ内部 id** (DR-046 §4 の内部 id、自動 id `#{seq}` と同じ空間):

- name は各種 name/key 系パラメータ (結果キー・トリガ導出・env 名導出) のデフォルト集約であって、一意識別子として設計された属性ではない。「name で lookup し、定義時に id へ束縛する」の 2 層が正確な意味論
- 帰結: 解決の一意性 (同名要素のシャドーイング・スコープ跨ぎ) は「どの id に束縛されたか」で語る。束縛は定義時に固定され、実行時に name の再解決はしない
- wire に id は露出しない (自動 id 非露出の既裁定)。本節は実装変更でなく意味論の明確化

## 採用しなかった案

### definitions.types への相乗り

DR-032 の「ref が指すのは name (ノード)、type が指すのは型」の区別と正面衝突する。types はクロージャ持ちパーサの座席 (DR-061 の configurable factory config が既に住む) で、純構造のテンプレートを混ぜると「パーサ登録とユーザ定義の複合型エイリアスが混ざる」気持ち悪さが増す。

### definition 直下の頂上 `templates` 節 (definitions とは別)

DR-035 の対称性を無傷に保てるが、頂上キーが増える。definitions の語義 (「定義する場所」) に templates も正確に収まる (§2) ため、並置 (definitions.templates) の方が「types = クロージャあり / templates = クロージャなし構造」の役割分担が区分の並びとして見える。

## 射程外

- DR-007 の `{"ref":"run","name":"exec"}` が示唆する **ElemDef 全体継承**の用法と、実装の ref_target (消費文法 Node の差し替えのみ) の意味論差 — 別 issue で追跡 (kuu.mbt 側で検出済み)
- templates 内テンプレートの相互参照・再帰の可否 (repeat lowering の自己参照 template は engine 内部の同空間住人だが、ユーザ宣言の再帰はゼロ進捗検査 DR-054 `zero-progress` の対象になるはず — 実例が要る時に詰める)

## 関連

- DR-032 (ref/link の解決順 — §3 が「name を指す」を精密化) / DR-035 (definitions の区分 — §2 が templates を追加)
- DR-046 §4 (内部 id) / DR-057 (参照ファミリー) / DR-054 (absent-ref / zero-progress)
- DR-028 (type as reference — type 側の解決順、本 DR の対比相手)
- DR-104 §2 (ref template 越しの complete origin: trigger は参照元要素名、値位置は template 内部 leaf 名)
- 蒸留 1:1 audit: docs/findings/2026-07-09-distill-1to1-coverage-audit.md 漏れ #1/#2
