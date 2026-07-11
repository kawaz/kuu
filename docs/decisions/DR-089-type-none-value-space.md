# DR-089: type 省略 = none — 値空間なしの node (値空間と消費の直交)

> 由来: issue typeless-option-default-semantics (DESIGN の「type 省略可」宣言に対し省略時の意味論が未規定、decoder は type 必須でより厳格)。kawaz 裁定 (2026-07-11): 「素直に表現するなら型なし。ないものに勝手に値型をあてるのは手抜き」「値空間なしは良いとして何で勝手に消費ゼロになるのか — 引数消費するけど値空間なしは普通にある」。

## 決定

### 1. type が規定するのは値空間だけ — 消費は構造の関心

node の **type は値空間 (どんな値を運ぶか) のみを規定**する。トークンの消費は構造 (repeat / 値スロット / exact / filter の Accept 報告) が規定する (DESIGN §5.2「消費数は Accept の報告値」の帰結)。2 軸は直交しており、type の有無・種類が消費を決めることはない。

### 2. type: "none" = 値空間が空の node。省略は none の糖衣

`type: "none"` を第一級で定義する。値空間が空 — 発火しても値を運ばない。**type 省略 = `none`** (省略 = default の構造等価、DESIGN §7.1 の `long:true = [":set"]` と同じ流儀)。

消費は §1 のとおり構造次第で、none でも全域が書ける:

- 消費 0 の純トリガ: `{"name": "sep", "long": true}` — exact 発火のみ
- 食って捨てる: shell の `:` 組み込みのように `{"name": "colon", "type": "none", "repeat": {"min": 0}}` + `(_) → Accept(1)` 級のフィルタで「任意個のトークンを受理して値を残さない」
- dd (`--`) や variant の exact 群は既存の「消費するが値を運ばない」族の実例

### 3. 値の結果には現れない — 発火の観測は ParserContext / explains 層の管掌

値空間が空なので、シンプルモードの結果オブジェクトにキーは現れない (値の無さはフィールドの不在、DR-051 §1/§4)。発火したこと自体を知りたい消費者は **ParserContext (DR-016 の 2 層分離のメタ層) / explains 系 API** で引く — 発火した node の id (または参照元祖先の id) から committed フラグ群を集める形。リッチエラー・デバッグ・アプリ独自表示はこの層の関心である。観測のために type を flag に変えるのは値空間 (= 意味と構造) を変えてしまうので誤り。

### 4. none node の関わる判定

committed 基準の制約 (conflicts / exclusive、requires のトリガ側) には通常どおり参加する。値充足を要求される席 (requires の目的語等) には値空間が無いため立てない — 静的に既知なので definition-error (DR-083 §5 の筋)。

## 採用しなかった案

### 省略時の既定型を当てる (option=flag / positional=string 等)

無いものに値型を当てる手抜き (kawaz)。CLI 慣習との一致は理由にならない — 慣習の flag が欲しければ明示すればよい。既定型はユーザの意図しない値セル・default 同梱 (flag の false 等) を勝手に生やす。

### decoder の type 必須を spec に追認する

DESIGN の「所属配列で役割が定まるので type フィールドは省略可」が先にあり、必須要求は実装都合の厳格化だった。

## 波及

- kuu.mbt: decoder の type 省略受理 (= none)、none node の entity/消費構造/definition-error (§4)。対 issue を kuu.mbt に起票
- fixtures: 純トリガ (消費 0、result 非掲載、committed 系制約への参加) / none×repeat の食って捨てる輪郭 / none を requires 目的語にした definition-error
- DESIGN: §1.4 の type 行に「省略 = none」を注記、型プリセット節 (§2.x) に none を追加
- issue typeless-option-default-semantics は本 DR で close

## 関連

- DESIGN §5.2 (消費数は Accept の報告値 — 直交の根拠) / DR-051 §1・§4 (値の無さはフィールド不在、null なし) / DR-016 (2 層分離 — 観測はメタ層) / DR-064 (dd — 消費するが値を運ばない先行例) / DR-083 §5 (静的既知は定義時に倒す)
- issue typeless-option-default-semantics (経緯)
