# DR-040: type registry の方言運用 — canonical default / 言語DX / ロック / 制限手段

> 由来: kawaz × Claude のリモートセッション議論。DR-010/028/035 の registry 枠組みの上での運用方針。

## 決定

### プリミティブ型は「方言」を持ち、3層で上書きできる

`number` / `bool` 等の基本パーサにも方言がある (アンダーバー無視 `3600_000`、基数 `0x`/`0b`/`0o`、サフィックス `f`/`L`、`\x`、カンマ等)。これを3層の上書きで扱う (DR-028/035 の解決順 `definitions.types.X → registry.types.X → warn+string` にそのまま乗る):

```
kuu canonical default  ←  言語DX default  ←  ユーザ差し替え (definitions.types で shadow)
                                              後ろほど優先 (DR-034 と同じ流儀)
```

- **canonical default は言語中立で再現可能な1つ**を基準に置く (移植時のデフォルト挙動が予測可能)。言語DX/ユーザの差し替えは「そこからの逸脱」と位置づける。
- **移行ロック**: 既存プロダクト (例: Python) から乗り換えて `parse_number` 挙動を変えたくない場合、`definitions.types.number = "contrib_python_number_parser"` で固定。単一ホスト内では完全に効く。
- プリミティブ × メジャー言語方言は **方言バンドル** (`contrib_python` が number/int/float/bool をまとめて登録) で提供すると移行体験が良い。

### 方言の軸を2系統に分ける (type 名を組合せ爆発させない)

軸が直交 (underscore × radix × comma × suffix…) なので型名で網羅しない。2系統に割る (どちらも既存の道具、新フィールド不要):

| やりたいこと | 手段 |
|---|---|
| **狭める (拒否)** | `pre_filters: regex_match` で門前払い (寛容 default に `^-?[0-9]+$` 等を噛ます) |
| **正規化して受ける** | `pre_filters: replace` で `_`/`,` 除去してから default に渡す |
| **本質的に別の字句/解釈** | value_parser 差し替え (基数解釈・サフィックス・エスケープ) |

→ **「寛容 default ＋ pre フィルタ制限」が素のデフォルト経路** (実用の大半をカバー)、**named 方言パーサは解釈を変えたい時の逃げ道**。両方が同じ registry に共存。

注: カンマ除去を default number に焼き込むと `multiple.separator=","` と衝突 (`"1,000"` が数値か `[1,000]` か曖昧) → カンマ除去はデフォルトに入れず明示 pre_filter に。

### バイナリサイズ / tree-shaking

方言は core に入れず拡張パッケージ (DR-010 の3階層、明示 import)。AtomicAST は parser を**名前 (文字列) で参照・実装は外部注入** (DR-027/036) なので**未参照 parser は自明に dead-code** → rollup が効く。`diagnose` が参照名集合を出すのでバンドラが最小セットを判定。`kuu-cli` は全部入りバイナリ、ライブラリは tree-shakeable、と配布で切替。

### canonical default の字句仕様 (F-006/017/018/024/044 の確定)

3 層の基準になる canonical default を以下に固定する:

> **updated by DR-074**: 下記の数値項 (10 進最小・JSON number 同型) は DR-074 で **実用寛容な 10 進固定字句へ改訂**された (leading `+` / `007`=decimal / `.5`・`1.` / `_` default 桁区切り / 基数 prefix + hex float の統合 opt-in / inf は float 型のみ・nan は両型 Error / 型 suffix 非採用)。**bool の canonical 字句は DR-040 に項がなく DR-074 で新設**。本節の 3 層構造・2 系統の方言軸・configurable factory 方式 (DR-061) は不変。number/bool 字句の正本は DR-074 + DESIGN §3.3-3.4。

- **数値 (number / int / float)**: 10 進最小構文のみ (`[+-]? digits [. digits] [e...]`、int は整数構文。number は JSON number と同型、DESIGN §3.3)。桁区切り `_` と基数 prefix (`0x`/`0o`/`0b`) は canonical に含めない — 標準層の opt-in (型パラメータ / pre_filter 正規化)。`,` 系 (欧州小数点・桁区切り) は**多義** (`1,234` が 1234 とも 1.234 とも読める) のため canonical では解決不能な方言軸の見本であり、方言でのみ提供。単位 suffix (`1k` / `30s`) は数値字句ではなく型の領分 (duration / size 等の拡張型)
- **exact 照合**: Unicode **codepoint 単位の比較、正規化なし**。NFC/NFKC 正規化は方言 (pre_filter / installer パラメータ) で opt-in。言語ランタイム間で照合結果が割れない最小定義
- **path / file / dir**: OS の文字列 API が通したバイト列をそのまま受理 (エンコーディング検証なし)。存在検証・種別検証は filters の opt-in
- **count の上限**: 専用フィールドを持たない。上限・飽和は post_filters (in_range 等) で書く。`--verbose=3` は count が値を取らないため eq-split の読みが立たず素通し。値も受けたい場合は **`count_or_set`** プリセット (標準層): increment + optional 値スロット (`repeat: {min:0, max:1}`) の合成で、`-v 3` の set / increment の別は取り分選好 (DR-043、greedy 既定で set 先行・下流失敗で後退) が 1 本に確定する — 新しい評価規則は不要
- **filters registry の階層**: 本 DR の 3 層 (canonical / 標準 / 拡張) を filters registry にも適用する。組み込み filter の canonical シグネチャ一覧は垂直スライス実装と共設計で確定する (DR-039 の流儀)

### 再現性の射程 (注意)

名前ピンで得られる再現性は2段階:
- 単一ホスト/言語内の「移行ロック」→ 完全に効く。
- クロスホストの byte-identical 再現 → 名前は「意図」をピンするが「バイト挙動」は contrib 方言の**仕様の精度次第** (実装は host 注入)。跨いで一致させたいなら方言パーサは**精密な spec**を持つべき。

regex を wire に載せる場合も同様に **regex 方言の一致**が cross-host 条件 (`^[0-9]+$` 級は安全、lookahead/Unicode はホスト依存)。

## 関連
- 再設計 DR-010 (外部レジストリ)、DR-028 (type=参照糖衣・解決順)、DR-035 (definitions/registry 対称)、DR-036 (multiple registry)、DR-037 (Reject/Error)
- ボトムアップ kuu: `src/contrib/` 命名規約、[external: kuu.mbt DR-057]・[external: kuu.mbt DR-059] (kuu-cli・tree-shaking)
