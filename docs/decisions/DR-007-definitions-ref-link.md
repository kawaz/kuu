# DR-007: definitions 領域、ref (構造継承) と link (値同期) の分離

## 決定

各 scope に `definitions` フィールドを設け、テンプレート/値プレースホルダ専用領域として使う:

```json
{
  "definitions": {
    "color_template": {"type": "string", "values": ["red", "green", "blue"]}
  },
  "options": [
    {"ref": "color_template", "name": "fg"}
  ]
}
```

参照は2種類:
- **ref**: 構造継承 (プロトタイプ的)
- **link**: 値同期 (書いた側が参照、書かれた側が実体)

`definitions` 内の要素は **デフォルトで結果オブジェクトに露出しない** (CLI 上で直接消費されない、テンプレート/プレースホルダ専用)。スコープ階層的に書ける (各 command で独自の definitions)。

## 経緯

最初は ref/link で参照対象を children の中に混ぜていたが、kawaz の整理:

> colorみたいな再利用可能な構造をrefで参照する用とか、timerangeみたいな複数オプションからlinkで実態参照される値のプレースホルダ的な要素とかを定義する場所も欲しいか？
> childrenの中に混ぜれもするけど分けれた方が見通しが良くなって嬉しい気もする。

定義領域を `definitions` フィールドで分離することで:
- 「テンプレートとして使う要素」と「CLI で起動する入口」が視覚的に区別される
- definitions 内の要素はデフォルトで結果オブジェクトに出ない (CLI 上で直接消費されない)
- スコープ階層的に書ける (各 command で独自の definitions)

## ref vs link

| | ref | link |
|---|---|---|
| 引き継ぐもの | 構造定義全て (型/children/filters/...) | 値の書き込み先のみ |
| 用途 | 消費文法テンプレートの共有 (definitions.templates、DR-078 §1) | 別経路での値供給 |
| 比喩 | プロトタイプ継承 | 参照渡し |

ref は definitions.templates に置いた共有消費文法を複数要素から参照し、構造を継承する (DR-078 §1/§3 — ref の参照実体は定義実体の内部 id):
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
  "options": [
    {"name": "fgcolor", "ref": "color", "long": true},
    {"name": "bgcolor", "ref": "color", "long": true}
  ]
}
```

別入口 (別名) + deprecated (「旧綴りは残しつつ警告する」用途) は ref の管掌ではなく **DR-057 の alias が担う** (`{"alias": "port", "short": "o", "deprecated": true}` — canonical 実体への入口追加。ref による ElemDef 全体継承でこの用途を代替する読み方は DR-057 制定時点で alias に完全に譲られている)。

link は「値の流入先のワイヤー」:
```json
{"name": "since", "link": "since_value"}
```

## link の方向性

kawaz の整理:
> linkに関して値の主従は特になくてどっちでも良いのでは?

から、議論の中で:
> linkは基本linkを書いた側が参照でlinkされた方が実体て方が素直と思う。

**書いた側 = 参照、書かれた側 = 実体**、という方向性を持たせる。これで:
- 入口 (参照側) から実体への書き込み一方向で動作
- 双方向同期の複雑さがなくなる
- 「実体は1つ」が明確

## 関連

- DR-006 (lexical scope chain)
- DR-029 (固定パス DSL による link 拡張)
- DR-032 (ref/link/type の関係再整理)
- DR-035 (definitions の区分付き名前空間化)
- DR-057 (alias — 別入口 + deprecated 別名は ref でなく alias の管掌)
- DR-078 (definitions.templates 新設、ref の参照実体は内部 id という精密化)

## Superseded (歴史)

> 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。

### 構造化タイプへの link (セレクタ言語) は採用しない → DR-029 で部分更新

> **更新: DR-029 により、本 DR で不採用としていたセレクタ言語的 link が「固定パス DSL」としてスコープを絞った形で再採用された。本 DR の ref/link 二分類および「書いた側=参照、書かれた側=実体」の方向性は引き続き有効。**

当初は以下のようなセレクタ言語的ネスト link を不採用としていた:

```json
{"link": "tr.since"}  // セレクタ言語的なネスト link
```

理由:
- 言語実装が複雑 (Go/MoonBit でリフレクションなし)
- セレクタ言語の設計負担

初期スコープでは入れず、primitive な値セルに分解して構造で表現する方針だった。DR-029 で固定パス DSL として再採用された (セレクタ言語全般ではなく、スコープを絞った形で)。

### flat な definitions マップ → DR-035 で更新

> **更新: DR-035 により、本 DR の例で示した flat な `definitions` マップは区分付き名前空間 (`definitions.types` / `definitions.accumulators` / `definitions.filters` / ...) に再編成された。本 DR の「definitions という独立領域を設ける」「definitions 内要素はデフォルト非露出」「スコープ階層」の各原則は引き続き有効。**

### ref/link の二分類 → DR-032 で再整理

> **更新: DR-032 により、本 DR の「ref vs link」の二分類は type を含めた三者 (ref/link/type) の関係として再整理された。本 DR の各々の意味 (ref=構造継承、link=値同期、書いた側=参照) は引き続き有効。**
