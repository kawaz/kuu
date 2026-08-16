# DR-124: inheritable の廃止 — 祖先スコープからの書き込みは外側 option + `inherit: {from}` で書く

> **更新 (DR-125、2026-07-29): §2 の代替パターンの綴りが `inherit: {"from": ...}` から
> `default_fn: "borrow:<外側要素名>"` へ移った。** パターンの骨格 — 外側スコープに通常 option を
> 置き、内側要素がそれを明示参照する — は不変で、既定値だけが内側の `default` から外側の
> `default` へ移る (両者は同じ default 席なので併用できない、DR-125 §3)。§3 (「inherit は存続する」)
> は対象を失っており、値源ラダーは 4 段。§1 の inheritable 廃止と §4 以降の根拠は不変。波及節が
> 代替として新設した `value-sources/inherit-from-ladder.json` も削除され、同じ役割は
> `value-sources/default-fn-borrow-ladder.json` (外側 option + `default_fn: "borrow:<外側要素名>"`) が
> 引き継ぐ。

> 由来: kawaz 裁定 2026-07-29「inheritable いらない。できる方法としては『ref+name+default borrow で済む話』を
> 使ったサンプルとか fixture にしとけば良い」。dogfooding (authsock-warden 型の socket-ttl) で inheritable の
> 実需を検討した結果、1 段のユースケースは既存語彙で書け、固有価値は多段チェーンの自動化のみと確定した。

## 決定

### 1. `inheritable` 語彙を廃止する

wire 属性 `inheritable`、それを回収する inheritable installer、help model の `origin.kind = "inheritable"`、
DR-059 の prefix 生成規則 (`<定義スコープ名>-<name>`)、祖先スコープへの逆方向コピーと write-target セルの
すべてを仕様から落とす。canonical installer セット (DR-042) は inheritable を含まない。

### 2. 代替は「外側スコープの通常 option + 内側の `inherit: {from}`」

祖先スコープから内側要素の既定値を与えたい定義は、外側に普通の option を宣言し、内側要素の inherit 席で
それを名指しする:

```json
{
  "options": [
    {"name": "socket_ttl", "type": "number", "long": true}
  ],
  "commands": [
    {
      "type": "command", "name": "socket",
      "options": [
        {"name": "ttl", "type": "number", "long": true,
         "inherit": {"from": "socket_ttl"}, "default": 60}
      ]
    }
  ]
}
```

- 外側は `--socket-ttl`、内側は `--ttl` で、綴りは inheritable が生成していたものと同じ
- 値の序列も同じ: 内側 CLI > (env / config) > inherit (= 外側の解決値) > 内側 default (DESIGN §11.4)
- 外側で書いた値が外側スコープの結果キーに出る点も同じ (`socket_ttl` は普通の option なので当然)

新機構はゼロで、`inherit: {"from": ...}` と通常の option 宣言の合成だけで閉じる。

### 3. inherit は存続する — inherit と inheritable は別機能

`inherit` は値源ラダー第 4 席 (DR-031) であり本 DR は一切触らない。DR-013 のうち存続するのは inherit 側、
廃止するのは inheritable 側である。両者は「取りに行く (inherit)」と「書きに行く (inheritable)」で向きが逆の
別機能であり、名前が似ていることによる混同を本 DR の適用範囲の誤解に持ち込まないこと。

## 根拠

### 固有価値は多段チェーンの自動化だけ

inheritable が代替で書けないのは「n 段の入れ子すべてに、宣言 1 個で書き込み入口を自動配布する」ことだけ。
実際に検討した実需 (authsock-warden の socket-ttl 型) は 1 段で、§2 の形で書ける。多段が要る定義は各段に
inherit 宣言を書けばよく、書く手間は段数に比例するが**どこから値が来るかが定義に明示される**。

### 暗黙の遠隔作用を仕様から外せる

inheritable は「子の宣言が祖先スコープの表面に入口を生やす」機構で、祖先の help / 補完 / 結果キーが
子孫の定義次第で変わる。他の CLI パーサに前例がなく、利用者にとっても定義を読む方向が逆転する。
§2 の代替は外側に宣言があるので、祖先の表面は祖先の定義だけで決まる。

### 維持コストが実利を上回る

廃止で不要になる規定: prefix 生成規則と全祖先同綴りの根拠 (DR-059 §1〜§3)、祖先 write-target セルの
結果キー露出 Model Y (DR-059 §5 / DESIGN §11.3)、help origin の 3 値目 (DR-113 §4.3)、
そして未規定のまま残っていた交差面 (per-copy の `export_key` opt-out = 「導管のみ」、alias × inheritable の
合成、world 境界での遮断)。いずれも実需の裏付けなしに設計余地だけが積み上がっていた。

## 波及

- **DESIGN**: §11.3 (inheritable) を削除。§11.2 (inherit) に §2 の代替パターンを追記。§1.4 の wire form
  フィールド一覧・§15.15 の宣言層寄与と help model 例・origin 定義・§16 用語表から除去。
  **§11.4 (値源の優先順位) は番号を動かさない** — 節番号は他リポ (kuu.mbt / kuu-cli) と fixture の why から
  引用される安定識別子であり、§11.3 は欠番として空ける
- **REFERENCE**: 語彙表と属性節から `inheritable` を除去。`global` 節の「`inheritable` の鏡像対称」を削除
- **schema**: `wire.schema.json` の `inheritable` プロパティ、`fixture.schema.json` の `helpOrigin.kind`
  enum から `"inheritable"` を除去 (`["global"]` のみ)。`builtin-descriptors.json` に inheritable の
  descriptor は存在しない (installer descriptor は未実体化、V1-R08) ため変更なし
- **fixtures**: `inheritable-parse/` (4 file)、`value-sources/inheritable-ladder.json`、
  `lowering/inheritable/with-long.json`、`help/origin-inheritable.json` を削除。代替として
  `value-sources/inherit-from-ladder.json` (外側 option + `inherit: {from}` の 3 case) を新設
- **DR-013**: inheritable 節を Superseded 注記。inherit 節は現役
- **DR-059**: 全体 Superseded
- **DR-042**: canonical installer セットから inheritable が抜ける (§注記)
- **DR-113**: `origin.kind` の値域から `"inheritable"` が抜ける (§注記)
- **DR-112 §2 / DR-120 §4 / DR-016**: inheritable を例として挙げている箇所は例が 1 つ減るだけで、
  規範 (宣言層寄与を読む / 結果キーを占有する要素の参加 / 結果への焼き付け) は他の installer で保たれる
- **kuu.mbt**: inheritable installer と help origin の該当分岐、conformance fixture の追随
- **kuu-cli**: inheritable を使う定義があれば §2 の形へ書き換え

## 採用しなかった案

### 存続させたまま未規定面を詰める

「導管のみ」「alias × inheritable」「world 境界」を規定すれば整合はする。しかし実需が 1 段のみと確定した
段階で、多段自動配布のためだけに交差面を 3 つ規定するのは v1 の完備性ではなく設計余地の温存になる。

### global との対称性を理由に残す

global (親 → 子孫) と inheritable (子 → 祖先) の鏡像対称は設計上美しいが、対称性そのものは利用者の要求では
ない。global は「1 箇所の宣言を全子孫の**入口**に配る」もので実需 (`--help` / `--verbose`) があるのに対し、
inheritable の逆方向は実需が見つからなかった。片翼だけ残すことに設計上の不整合はない。

## 関連

- DR-013 (inherit / inheritable — inherit 側は現役、inheritable 側を本 DR が Superseded)
- DR-059 (inheritable の prefix 生成 — 本 DR が全体を Superseded)
- DR-031 (値源の優先順位 — inherit 席は不変) / DR-087 / DR-088 (inherit 宣言の遅延解決)
- DR-042 (installer — canonical セットから 1 件減る) / DR-113 §4.3 (help origin の値域)
- DESIGN §11.4 (値源の優先順位) / DR-125 (inherit 廃止 — 代替パターンの現行正本)

> **更新 (2026-08-16): 本 DR が代替パターンの正本として指していた DESIGN §11.2 は欠番。** `inherit` 自体が DR-125 で廃止され、DESIGN §11 配下は現在 §11.1 / §11.4 のみである。代替パターンの現行の読み先は DR-125 (廃止の判断と移行) と DESIGN §11.4 (残った値源席の優先順位)。
