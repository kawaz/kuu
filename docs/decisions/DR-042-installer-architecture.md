# DR-042: installer アーキテクチャ — 特殊語彙は装置が持ち込み、5 つの不変則で合成する

> 由来: 本セッションの議論で確定。DR-041 (トークン読みの意味論) と対。findings `2026-06-29-ast-missing-pieces.md` の F-002 / F-003 / F-007 (方向) / F-029 (方向) / F-031 (方向) / F-035 / F-041 (受け皿) に関係する。

## 決定

### installer とは

`long` / `short` / `env` / dd のような**特殊語彙 (属性名・type 値) は、コア文法ではなく installer の所有語彙**とする。installer は registry に登録される装置で、1 単位で次の 3 役を担う:

1. **所有語彙の回収**: UsefulAST から自分の語彙を読み取る (削除はしない — 不変則①)
2. **展開の植え付け**: 糖衣展開 (衛星構造の追加・再スコープ化) を行う
3. **実行時能力の提供**: 必要なら再解釈 matcher (トークン読み、DR-041) や値源 lookup を評価器に登録する

parse_definition (UsefulAST → AtomicAST) は installer 適用の連鎖として構成される。コア文法は atomic (exact / or / seq / primitive + multiple) と name / ref / link 等の骨格のみに縮む。

### 先行例: このパターンは既に中心原理

`type` (types registry) / `filters` (filters registry) / `multiple` (multiple registry) は「フィールド名で registry が暗黙決定」(§13.2) されており、**属性語彙と registry 実装のペアは kuu の既定路線**である。`long` / `short` / `env` は registry の後ろ盾なしにハードコードされた取り残しであり、本 DR はこの非対称を解消する。シュガーが増えるたびにコア属性が増殖する問題も、installer の追加 (= 語彙の所有者の追加) に置き換わる。

### 5 つの不変則 (合成契約)

installer の合成を順序非依存・冪等に保つ。組み込み installer はこれを厳守し、外部 installer にも遵守を求める (破る実装が悪い、という責任分界):

1. **宣言層は読み取り専用、寄与は追加**: installer は所有語彙を読むだけで、削除も書き換えもしない (意味論的削除 — 評価ループは installer 所有語彙をそもそも見ないので、残っていても「ないのと同じ」)。寄与は lowered 層への**決定的な追加**であり、同一寄与の再追加は no-op (add-if-absent) — 冪等はここから出る。未知語彙の完全性検査は「registry の所有語彙集合に載らない特殊語彙の検出」で行い、エラー + 次の手 hint (§13.5 の型) を出す。宣言属性が inert に残ることで help 生成・diagnose・再シリアライズが元の宣言情報を保持できる。
2. **追加的寄与**: 既存要素への in-place 操作は値源席への宣言まで。構造の寄与は衛星 (新要素) の追加で行い、**他 installer の lowered 産物 (衛星・matcher・席) を書き換えない・読んで反応しない**。宣言層への追加 (global の宣言的コピー等) だけが後続の回収対象になる。第 3 の寄与形として**自要素の決定的下降**を認める — 所有語彙が付いた要素自身の消費形を決定的に与える lowering (repeat の cons 化、command の部分木配線など)。自要素の宣言のみから決まるため交換可能性を壊さない (7 installer 全順列で実測済み)。
3. **所有語彙の交差禁止**: 同一語彙を 2 つの installer が所有したら registry 登録時にエラー。
4. **値源はラダー席への宣言**: 値源系 installer (env 等) は default_fn を直接ラップせず、**エンジンが所有する DR-031 の優先順位ラダー**の席 (env / config / inherit / default) に lookup を宣言する。lookup は (value, source) を返し、ParserContext の source タグ (DR-016 / DR-031) を保存する。ラダーの順序自体は installer から動かせない。
5. **背骨 (spine) の切替は構造で表現する**: greedy が発火できるのは**宣言スコープの背骨** (そのスコープの positional 進行の消費点列) に復帰した箇所のみ。command 部分木は新しい背骨を宣言し (祖先の greedy は届かない)、greedy の内部消費と dd の継続には背骨がない (何も発火しない)。スコープ越えの可用性は評価器の例外ではなく global installer の**構造コピー**で表現する (祖先背骨を重ねる評価器実装は、観測等価な encoding としてなら自由)。

順序依存が要ると感じたら不変則違反の徴候として設計を見直す (priority フィールドや配列順への依存は持ち込まない)。installer 間の見かけの依存 (例: global が置いた宣言的コピーを long が展開する) は、**寄与が増えなくなるまで全 installer を繰り返す不動点反復**で解消する。停止性は「寄与は要素 × スコープで有限、コピーのコピーは同一実体への ref なので add-if-absent が止める」から、合流性は不変則①②から出る。

### 展開の標準パターン: ref/link 衛星 + 実体だけノード

```json
{
  "type": "command",
  "options": [
    {"name": "port", "type": "number", "long": [], "short": "p", "env": "PORT"},
    {"name": "version", "type": "flag", "short": "v"}
  ],
  "positionals": [
    {"name": "--", "type": "dd", "optional": true},
    {"name": "dir", "type": "dir"}
  ]
}
```

- **long installer**: `long` を回収し、greedy 面に衛星 `{or: [{seq: [{exact: "--port"}, {ref: "port", link: "port"}]}, ...]}` を追加
- **short installer**: `short` を回収し、greedy 面に再解釈 matcher (cluster / 値付着の読み生成、DR-041 §3-4) を追加。回収したエントリ表 `{p: port, v: version}` が matcher の構成データ
- **env installer**: `env` を回収し、port の env 席に lookup を宣言 (不変則④)
- **dd installer**: `type: "dd"` を回収し、greedy 面に exact 衛星 (トリガ兼消費者、matcher は素の exact 一致) を追加。発火後は positional 継続を内部消費として引き継ぐ (sever は DR-041 §4 の内部一体則から導出、不変則⑤)

元要素は評価ループから見て、マッチ能力を衛星に移譲した**実体だけノード (DR-030)** として振る舞う (宣言属性は inert に残る、不変則①)。衛星は ref (構造継承) + link (値同期) で実体に接続する。使う語彙は既存プリミティブのみであり、DR-041 §1 の「AtomicAST スキーマ不変」をこの形が支える。

### canonical installer セット

registry の 3 層構造 (DR-010 / DR-040) に従い、標準として同梱する:

| installer | 所有語彙 | 植え付けるもの |
|---|---|---|
| `long` | `long` 属性 (variant DSL の値語彙 DR-011 を含む) | greedy 衛星 + eq-split 再解釈 matcher。config `long_prefix` / `allow_equal_separator` がパラメータ |
| `short` | `short` 属性 | greedy 衛星 + cluster / 値付着の再解釈 matcher。config `short_prefix` / `short_combine` がパラメータ |
| `dd` | `type: "dd"` | greedy 面の exact 衛星 (matcher は素の exact 一致)。発火後は継続を内部消費として引き継ぐ |
| `env` | `env` 属性 | env 席への lookup 宣言 |
| `command` | `commands[]` / `type: "command"` | DR-018 の or 式で positional 面へ展開。トリガは greedy マーク付き exact 衛星、部分木は新しい背骨を宣言する |
| `global` | `global` 属性 | 子孫 command スコープへ ref/link 衛星の宣言的コピーを追加。**トリガ literal が重なる**宣言を自前で持つスコープへはコピーしない (= shadowing。判定は要素名ではなくトリガ literal — 別名でも同じ `--verbose` を持てば衝突。最小スコープ優先 = lexical 解決 DR-032/033 のパース時適用)。**shadow は配下 subtree 全体に及ぶ**: 中間 command が shadow したトリガは、その配下の孫スコープ (自前宣言なし) にもコピーされない — per-scope の独立判定ではなく lexical 連鎖 (slice PoC 第 8 弾で 3 段実測)。findings F-007 の受け皿 |
| `inherit` | `inherit` 属性 | inherit 席 (DR-031) に「最近祖先の同名実体の値セル参照」lookup を宣言 |
| `constraint` | `requires` / `exclusive_group` / `conflicts_with` 属性 | 遅延述語 (DR-047/055) の宣言。構造衛星は足さない |
| `alias` | `alias` 属性 | canonical 実体への別入口宣言を宣言層に追加 (global と同型の宣言的コピー、入口展開は各入口 installer が不動点反復で行う。DR-057) |
| `inheritable` | `inheritable` 属性 | 祖先スコープの宣言層へ prefix 付き入口宣言 (`<定義スコープ名>-<name>`) をコピー (global の逆方向、祖先の自前宣言優先。DR-059) |

方言 (Go 風単ダッシュ long 等) は拡張 installer または canonical installer のパラメータ差しで提供する。`repeat` / `multiple` は DR-043、`config` (config_key / type: "config_file") は DR-050、`constraint` は DR-055、`alias` は DR-057、`inheritable` の prefix 生成は DR-059 で、それぞれ canonical セットに加わった。

**所有権の粒度は属性単位**。variant DSL (`long: ["no:set:false"]`) は long 属性の値の中の語彙なので long installer の内部に閉じる。内部表現 (文字列 DSL / オブジェクト形式 / 両対応) をどこまで凝るかは installer 実装の自由度であり、プロダクトとしては全体バランスで決める — 影響スコープが installer 単体に閉じることが本質。

**所有語彙は要素の形を問わず付きうる**: inline 型でも構造でも **ref 要素**でも、installer は同じ規則で寄与する (例: `{"name": "hlcolors", "ref": "color", "repeat": {"min": 1}}` — DR-043 参照)。

### matcher の座席と表現 (垂直スライス PoC で確定)

- **座席**: 再解釈 matcher も **greedy 面のエントリ**であり、exact 衛星と同列の住人 (どちらもトークンを読む matcher であることに変わりはない)。filter 席でも専用席でもない。先食い判定 (DR-041 §4) が両者を一様に扱えることがこの座席を正当化する
- **表現**: 再解釈 matcher はクロージャではなく**名前付きデータ** (種別 + 回収エントリ表)。lowering 後の全体が比較・直列化可能になり、installer 順列テストの構造比較と AtomicAST のシリアライズ可能性の両方をこれが支える
- **installer の類型は「何を植えるか」の違い**: long / short は exact 衛星 + 再解釈 matcher、dd は exact 衛星のみ、env は席宣言のみ。いずれも同じ 3 役 (回収・植え付け・能力提供) の部分集合

### config 上の表現 (方向)

installer インスタンスの選択・パラメータ化は config (DR-014) の階層継承に乗せる。不変則により適用順は非意味なので、順序を運ぶ表現は不要。フィールド語彙の具体形は本 DR では確定しない (射程外、垂直スライスと DR-014 拡張で確定する)。

### 検証マトリクス (垂直スライスへの持ち込み)

canonical 4 installer のサンプル適用では合成の交換可能性を確認済み (サンプル数 1)。次に壊しに行くべき組:

| ケース | 試される不変則 |
|---|---|
| global × dd (スコープ横断複製 × greedy 断ち) | ⑤の例外規則と②の両立 |
| 1 要素全部盛り (long + short + env + count + required) | 衛星の link 合流、DR-015 あと勝ちと accumulator の合成 |
| inheritable prefix 生成 × long | 衛星の exact 語彙生成の交差 (③) |
| env × config_key (値源 2 つ) | ④のラダー宣言の順序非依存、source タグ |
| dd を options 側に置く歪み定義 | 語彙の配置制約のエラー報告 |

slice PoC で確認済み: canonical 4 installer の全 24 順列一致・1 要素全部盛り・dd 再スコープ・冪等 (第 1 弾、21/21 pass)、**7 installer の全 5040 順列一致・非削除①' + 不動点反復・global × dd・多段 global 伝播と中間 shadowing・repeat 再帰と result builder の整合** (第 2 弾、45/45 pass)、**早閉じ抑制と親背骨再開・実体効果ベース経路同一性・取り分選好 (greedy/lazy + 後退) と or 曖昧性の非侵食** (第 3 弾、58/58 pass)、**link 同期型 global (結果が root 側キーに現れること・同一実体複数入口の効果合流)・authsock-warden 3 段入れ子の raw 構造 (配列形の一意成立、pre フィルタなし負対照での丸呑み実測、map 形 key_from 仮実装)** (第 4 弾、66/66 pass)、**効果記述子 (op 4 種・committed 明示制御・経路同一性判定キーの op/operand 拡張・variant lowering)・from_entries 3 用法 (入れ子各段の独立 array/map 選択、key_from 仮実装の置換)・flatten の accumulators registry 正式化・optional = repeat{min:0,max:1} の還元・min≥2 / max 有限の unfold と取り分選好の併用・repeat × separator 併用・入れ子 repeat での大域長基準の完成判定の破れの実測確定 (スコープ境界相対化が必要、DR-043 末尾の予告どおり)** (第 5 弾、88/88 pass)、**link 合流の別トークン同時発火 — long/short 同名合流と global link-sync のスコープ跨ぎ合流の両経路で、あと勝ち (DR-015) と効果列の消費順保存 (DR-045) の成立・失敗時アクションの ambiguous 非発火 (DR-048)** (第 6〜7 弾、98/98 pass)、**3 段中間 shadowing の name-vs-trigger 微差 — shadow の subtree 被覆 (lexical 連鎖)・別 name 同 literal で shadow 成立・同 name 別 literal で非 shadow 伝播** (第 8 弾、101/101 pass)、**env × config_key の 4 値源ラダーと source タグ保存・env/config 席宣言の順列一致 (④)・config の構造不関与・循環禁止の静的検査・config 値の型変換 (DR-050 の垂直スライス)** (第 9 弾、110/110 pass)、**export_key (DR-052) と result builder — post-parse remap による直交実装で、キー上書き・kv/seq 両文脈の透過・昇格露出・presence marker・露出キー衝突の 8 項目** (第 12 弾、127/127 pass)、**DR-053 結末構造 (errors 全保持・argv 最深 primary・interpretations 全列挙・fired_action 両立)・DR-054 定義時検査 (全列挙 + hint、左再帰統一原理)・DR-055 制約語彙 (constraint installer の順列一致、conflicts_with の対称性と unset 非衝突、二重宣言の両評価、値依存合成の committed 判定、制約の経路選択参加)** (第 13〜15 弾、144/144 pass)、**DR-057 alias — short/long/command の別入口、variant の name 再導出 (affix 合成が規範、substring 復元は退化ケースで誤判定)、short 非継承、deprecated warnings (DR-058)、実体側制約の噛み合い、alias installer の順列一致** (第 16 弾、152/152 pass)、**DR-059 inheritable × long — 全祖先同綴り・値の意味論 (祖先書き込み→inherit チェーン→自スコープ CLI 優先)・自前優先 shadow・逆方向コピーの順列一致・eq-split 合成、祖先書き込みセルは name 共有セル + inherit 席の既存合成で閉じることを実測** (第 17 弾、158/158 pass)、**DR-060 補完クエリ — 期待集合の和集合・消費連動・command スコープ切替・生存和集合と dead end 除外の対照・after 整合フィルタ・alias/deprecated メタ・dd 発火後の greedy 非露出・終端ヒント。補完走査は評価器と別実装 (pending 状態の表現と dead end の目的差) が正** (第 18 弾、167/167 pass)。未実施: alias × inheritable の合成 (PoC の alias pre-pass 簡約が原因で仕様の欠陥ではない — DR-057 規定どおりの不動点 installer 化で解決見込み)、完成判定のスコープ境界相対化の根治 (破れは第 5 弾で確定済み、フルエンジンの設計論点)。

## 採用しなかった案

### long / short をコア文法として固定 (現状維持)

シュガー追加のたびにコア属性が増殖し、type / filters / multiple との非対称が残る。方言の差し替え点も作れない。

### 中央集権の gather-then-build プロトコル

各 installer の寄与を中央で収集してから一括組み立てする案。5 不変則で順序非依存が出るため、重い中央プロトコルは不要と判断。

### 値源の直接ラップ (`env_default_fn("PORT", original_default_fn)` 型)

ラップの巻き順が DR-031 ラダーの再実装になり (config_key が来た瞬間に破綻)、素通しラップは source タグを失う。席宣言型 (不変則④) に置換。

### priority フィールド / 配列順による適用順制御

順序依存を残す設計は不変則の放棄。順序が必要に見えるのは不変則違反の徴候 (見かけの依存は不動点反復で解消する)。

### 消費即除去 (installer が所有語彙を元定義から削除する)

当初案。削除すると後続 installer から宣言情報が見えなくなり、global × command のような組で適用順の制約が生まれる。読み取り専用の宣言層 + add-if-absent の方が、冪等・完全性検査を保ったまま順序自由度と宣言情報の保全 (help / diagnose / 再シリアライズ) を得られる。

### 評価器の多重背骨 (greedy の子孫スコープ到達を組み込み規則にする)

祖先スコープの背骨を子コマンド内でも第 2・第 3 の背骨として重ねる案。評価器に多重背骨と dd の相互作用の定義が増え、定義の局所性 (スコープの言語がそのスコープの宣言で閉じる) が崩れる。構造コピー (global installer) の観測等価な encoding としてなら実装が選んでよい。

### 統一名の候補で却下したもの

- **reader**: 読む = 受動的で、展開を植え付ける「操作の意図」が足りない
- **expander**: 糖衣展開は覆うが env / config の値源提供を覆えない
- **device**: 能動的に処理する processor 感がなく受動的な印象でズレる

**installer** は「展開ルール・実行時能力を植え付ける装置」との意味的一致で採用 (ボトムアップ実装の `install_*` 語彙との連続性は結果であって決め手ではない)。

## 射程外

- installer インターフェースの関数シグネチャの正規形は本 DR では確定しない (PoC の実測形は「(定義, 寄与先) を受けて回収と寄与を行う手続き」。垂直スライス DR-039 で実装と共設計する)。
- config 上のインスタンス表現のフィールド語彙は本 DR では確定しない (上述)。

## 関連

- DR-041 (トークン読みの意味論 — installer が植え付ける matcher の実行時契約、対で確定)
- DR-030 (実体だけノード — 展開の標準パターンの受け皿)
- DR-031 (値源の優先順位ラダー — エンジン所有、installer は席宣言のみ)
- DR-016 (ParserContext の source タグ — 不変則④が保存を保証)
- DR-014 (config — installer パラメータの供給源、階層継承)
- DR-010 / DR-040 (registry 3 層 — canonical installer の同梱区分)
- DR-035 (definitions / registry の一様性)
- DR-011 (variant DSL — long installer の内部語彙)
- DR-013 (inheritable — prefix 生成は DR-059 で確定、`inheritable` installer として canonical セットに収録)
- DR-039 (垂直スライス共設計 — シグネチャ確定の場)
- journal `2026-06-29-arggen-phase0-alignment.md`
- findings `2026-06-29-ast-missing-pieces.md` F-002 / F-003 / F-007 / F-029 / F-031 / F-035 / F-041
- 垂直スライス PoC (slice 枝 `poc/`、journal `2026-07-02-slice-poc.md`) — 24 順列一致・matcher 座席・2 類型の実測根拠
