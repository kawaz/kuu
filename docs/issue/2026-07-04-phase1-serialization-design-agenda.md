---
title: フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台
status: open
category: design
created: 2026-07-04T20:58:55+09:00
last_read:
open_entered: 2026-07-04T20:58:55+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (ROADMAP.md フェーズ1、docs/journal/2026-07-04-repo-restructure-handoff.md 残作業4)
---

# フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台

## 概要

ROADMAP.md フェーズ1「直列形の確定 + fixture フォーマット設計」の論点ツリーと選択肢を整理した議論用ドキュメント。まだ何も決定しない。次セッションの議論の出発点として、既存 DR / findings / LOWERING に散らばる未確定事項を1箇所に集約し、依存関係と選択肢を可視化する。

## 背景

- ROADMAP.md のフェーズ構成: 0 (cleanup, 完了) → **1 (本件)** → 2 (fixture 蒸留) → 3 (参照実装)。
- フェーズ1 の宿題は ROADMAP.md 本文で次の3点と明示されている:
  1. AtomicAST の concrete JSON (greedy マーク・matcher データ・効果記述子の直列形 = DR-039 の宿題)
  2. JSON Schema の実体化 (findings F-042 invariant / F-048 lifecycle をここで解消)
  3. conformance fixture のフォーマット (定義 + argv + 期待効果列/結果。期待値の厳密度 — byte 厳密 vs 意味論 — が主論点、DR-040 の方言 spec 精度問題と接続)
- LOWERING.md §C.3 が「greedy マークと再解釈 matcher データの直列形は未確定」と明記しており、本フェーズの直接の入力。
- docs/findings/2026-06-29-ast-missing-pieces.md の F-042 / F-048 が本フェーズで解消すべき2件として指名されている。

## 論点ツリー

### A. AtomicAST 直列形の確定 (LOWERING §C.3 の宿題)

#### A-1. greedy マークの直列形

`«greedy»` 注記 (LOWERING 全体で説明用に使われている疑似記法) を実際の JSON でどう表現するか。

- 選択肢 (a) ノード自体に `"greedy": true` の bool フィールドを持たせる
- 選択肢 (b) greedy 面のエントリ集合をノードとは別レイヤ (スコープ単位の index 配列) として持つ (out-of-band)
- 選択肢 (c) 背骨上の位置 (宣言スコープの positional 進行順) から暗黙的に導出し、専用フィールドを持たない

関連: DR-041 §4 (背骨・先食い・早閉じ抑制)、DR-042 不変則⑤ (背骨の切替は構造で表現)。判断材料: greedy 判定は評価器のホットパスで頻繁に参照される (先食み判定の毎回)。専用フィールド無し (c) は直列形を小さくするが評価器側の再導出コストとバグ余地を増やす。

#### A-2. 再解釈 matcher データの直列形

LOWERING で `{matcher: "<種別>", entries: {...}}` と便宜表記されている、eq_split / short_combine / dd 素exact の実データ構造。

- ノード形: 選択肢 (a) matcher 種別ごとに専用ノード型 (`eq_split_matcher` / `short_combine_matcher`) を分ける、選択肢 (b) 汎用 `{matcher: <kind文字列>, entries: {...}}` に統一
- エントリ表の値参照方式: 選択肢 (a) 実体への name 文字列参照、選択肢 (b) ref 構造への直接埋め込み (実体を指す構造をエントリ内に複製)
- DR-042 「matcher の座席と表現」節が既に「再解釈 matcher は greedy 面のエントリ、クロージャでなく名前付きデータ (種別 + 回収エントリ表)」まで確定済み — 本論点はその**具体フィールド語彙**を詰めるだけで、座席・データ性の再議論ではない

関連: DR-041 (installer が植え付ける matcher の実行時意味論)、DR-042 (matcher の座席と表現、既に slice PoC で座席は実証済み)。

#### A-3. 効果記述子の直列形

DR-045 が意味論 (`{exact, link, effect: {op, operand?}}`、op ∈ {set, default, unset, empty}) を確定済み。本フェーズでの残作業は JSON key 名・ネスト形の fix のみか、それとも additional な直列上の決定 (例: operand の型付け、順序フィールドの明示) が要るかの確認。

関連: DR-045、DR-038 (効果列 = 経路同一性の判定キー)。

#### A-4. repeat unfold の匿名ノード識別子の直列形

LOWERING B.8 の `file#geq1` (unfold が要求する再帰尾部の内部識別子) は「実装が匿名ノードに振る内部 id、直列形は DR-039 で確定する」と明記されたまま未確定。

- 選択肢 (a) 内部専用 id 文字列をノードに持たせる (`"id": "file#geq1"`)
- 選択肢 (b) 完全無名 (親ノードの子として構造的に埋め込むのみ、参照の必要がないなら id 自体不要)

判断材料: この id は ref (§10) から参照される必要があるか？ unfold は同一 name への自己再帰なので、id が外部から参照されるユースケースがあるかを先に確認する必要がある。

#### A-5. AtomicAST の直列形一意性の要否

installer の適用は不動点反復で構造的には収束するが (DR-042 §C.2)、JSON の syntactic な面 (key 順序、フィールド省略 vs null 明示等) まで一意にするか。conformance の構造比較 (LOWERING §C.5 の「緩比較」) に必要な粒度がどこまでかを本フェーズで判断する。

#### A-6. pending 状態の枝表現 (docs/journal/2026-07-04-repo-restructure-handoff.md 残作業4 で名指しされた入力)

DR-060 の補完クエリで観測された「parse の枝列挙が『トリガ消費・値pending』を中間状態として表現するか」という設計軸。slice PoC 第18弾の実測結論: PoC の Branch 表現 (Accept/Held) では pending 状態が表現不能で、補完は境界収集の専用走査に分離するのが正しい形だった (共有した抽象は「打ち切り位置での期待集合の収集」という 1 公理のみ)。pending を一級の枝として持つか否かは**評価器契約 = フェーズ3 の主要な実装設計論点**であり、AtomicAST 直列形 (本フェーズ A 群) 自体が pending を持つ必要はない可能性が高い。フェーズ1への効き方は「fixture が complete クエリをカバーするか (C-5)」経由が本線。A-2 のエントリ表設計時に前提として確認しておく。

### B. JSON Schema 実体化

#### B-1. F-042: AtomicAST の合法構造 (invariant) 定義

property-based test 用の合法 AtomicAST 生成器に必要な invariant。未確定項目 (findings 原文どおり):

- seq/or の children 最小数 (0個・1個は合法か)
- multiple を持つノードを or/seq children に入れる制約
- name の文字種・長さ制限
- 同一 seq 内の同名 long option 重複の合法性

DR-039 は「JSON Schema は実装と同時に詰める (単独確定しない)」と defer 条件を明記しているが、slice PoC が 18 弾・167 テストで実装済みの現状、defer 条件 (「垂直スライス後」) は実質満たされているとみなせるかが前提論点 (下記メタ論点も参照)。

#### B-2. F-048: JSON Schema lifecycle と breaking change 手続き

未確定項目 (findings 原文どおり):

- 確定版として発行するタイミング (フェーズ2 fixture 蒸留完了時 / フェーズ3 実装完了時 / 他)
- フィールド追加・削除・改名時の更新手続き
- `$schema` URI 埋め込み有無
- 複数言語バインディングのバージョン参照管理
- breaking change の定義 (フィールド追加=後方互換か、削除=破壊的か、意味論変更の扱い)

findings が提案する暫定処置 (「現在は共設計中=破壊的変更許容」を DESIGN.md §0 に partial fix として先行追加) は DESIGN.md §0.1 に「本仕様は垂直スライス実装 (DR-039) との共設計段階にあり、全域で破壊的変更を許容する」として反映済み — 本フェーズで詰めるのは lifecycle の**その先** (確定版発行条件・手続き) のみ。

### C. conformance fixture フォーマット

#### C-1. fixture 1件の構造

`定義 + argv + 期待値` の3つ組の具体スキーマ。最初の分岐点: **definition は UsefulAST (糖衣込み) か AtomicAST (lowering 済み) か**。

- UsefulAST を fixture の定義とする場合: 各実装の lowering (parse_definition) 実装力も同じ fixture でテストできる。ただし lowering の直列形一意性 (A-5) が前提として要る
- AtomicAST を fixture の定義とする場合: lowering は別の (LOWERING.md 準拠の) conformance test 群に切り出し、fixture は評価器のみを対象にできる。lowering 未確定 (A群) でも先に fixture 設計に着手できる利点

#### C-2. 期待値の厳密度 — byte 厳密 vs 意味論 (ROADMAP.md 本文が名指しする主論点)

LOWERING §C.5 の2段比較戦略 (主 oracle = 効果列、lowered中間形 = 構造骨格 + matcher種別/エントリ表の緩比較) を fixture の expected 表現にどう反映するか。

- 選択肢 (a) expected を「効果列」(実体, op, operand, source, 順序) の列で持つ — 直列形非依存、実装間の意味論一致を厳密に判定できる (LOWERING §C.5 の主 oracle と直結)
- 選択肢 (b) expected を「結果オブジェクト」(shallow view、§0.3) で持つ — 利用者に近い形だが optional semantics (F-022/DR-052) の3区別を表現しきれるかが要検証
- 選択肢 (c) 両方持つ (効果列を正本、結果オブジェクトは導出値としてテストの読みやすさ用に併記)
- byte 厳密比較が必須なケース (exact 照合の codepoint 単位・正規化なし = DR-040、NFC は方言。canonical default 数値字句 = 10進最小構文・整数値 float の最短形 "1" も DR-040/DR-050 §4 で確定済み) は fixture 側で明示タグ付けし、それ以外は意味論比較に倒す、という DR-040 の「canonical/標準/拡張3層」構造との接続方針も要確認

#### C-3. fixture runner の契約

- 効果列 oracle (LOWERING §C.5) を判定器として使う場合のインターフェース: 各実装がどの形式 (JSON配列 / 独自形式) で効果列を出力する契約にするか
- ambiguous / failure ケースの fixture 表現: DR-053 の `outcome` discriminated union (`success` / `failure` / `ambiguous`) をそのまま fixture の期待値スキーマに転用するか、fixture 専用の簡略形を作るか

#### C-4. fixture の意図コメント埋め込み

`tdd-and-test-design` (テスト = 真の仕様書) の原則を fixture にも適用する ROADMAP.md の明言 (「fixture の意図コメント (なぜこの入力・なぜこの期待、DR 根拠) は fixture データに同梱する」) をどう実現するか。JSON はコメント不可のため:

- 選択肢 (a) JSON5 / JSONC (コメント許容の JSON 方言) を fixture フォーマットに採用
- 選択肢 (b) 素の JSON + `"_comment"` 相当の予約フィールドを各 fixture に持たせる
- 選択肢 (c) fixture ファイルと1:1対応する隣接 `.md` に意図を書き、fixture 本体は素の JSON のまま

言語非依存 (定義の一部 = 各言語の JSON パーサがそのまま読める) という制約とコメント表現力のトレードオフ。

#### C-5. fixture がカバーするクエリの範囲 (parse だけか)

fixture の期待値は parse (DR-038/053) が本丸だが、仕様は他に 2 つの入口を持つ:

- **complete クエリ (DR-060)**: `complete(atomic, {before, word?, after?}) → 候補構造`。slice 第18弾で実装・9項目実測済み。fixture に `{before, after?, expected_candidates}` 形のケースを含めるなら、候補構造 (spelling / is_value / 型情報 / メタ / 終端ヒント) の直列形確定が本フェーズの追加宿題になる
- **parse_definition の失敗 (DR-054)**: definition-error の fixture ({不正定義, expected DefError 列 (element, kind, hint 有無)})。message 文字列は仕様でない (kind/element が仕様、文言はレンダラ) ため比較対象から外す規約が要る

選択肢: (a) フェーズ1 で 3 クエリ全部のフォーマットを確定 / (b) parse fixture のみ確定し complete / definition-error は後続フェーズで拡張 (フォーマットに拡張余地だけ確保)。

#### C-6. fixture のディレクトリ構成・命名規則

DR 番号ベース (`fixtures/dr-038-path-search/*.json`) か機能領域別 (`fixtures/multiple/*.json`) か。C-1 の definition 形式・C-7 の蒸留単位と整合させる必要がある。

#### C-7. 蒸留元 (slice 167テスト) からの変換方針

slice PoC の 167 テスト (kuu.mbt slice 枝、フェーズ2 の蒸留元) を 1:1 で fixture 化するか、意味論単位 (DR 単位 / 領域単位) で再編するかは本フェーズでなくフェーズ2の主題だが、C-1/C-6 の設計がフェーズ2の変換コストを左右するため、フェーズ1側で「蒸留のしやすさ」を設計基準に含めるかどうかは論点として明記しておく。

## メタ論点: フェーズ1着手の前提整理

DR-039 は「AtomicAST は単独で仕様確定せず、実装と同時に削り出す (垂直スライス)」と明言し、JSON Schema は「実装と同時に詰める」と defer 条件を置いている。ROADMAP.md フェーズ構成では、この「実装との共設計」は既に **slice PoC (kuu.mbt slice 枝、第1〜18弾、167テスト、DR-042 に実測記録)** で完了している — フェーズ1は白紙から設計するのではなく、PoC で実証済みの疑似 JSON 表記 (LOWERING 全体に `«greedy»` / `{matcher: ...}` として登場するもの) を正式なシリアライズ仕様に**格上げする**作業、と整理できる。

この位置づけの確認 (「DR-039 の defer 条件は slice PoC で充足済み、フェーズ1は新規設計でなく確定作業」) 自体を最初の合意事項とすることを提案する。異論があれば、フェーズ1着手前に別途 PoC (新 main での試作) を挟む必要が出るため、最優先の論点。

## 参考: 隣接する既決定事項 (本フェーズで再検討しない)

- DR-045 (効果記述子の意味論)
- DR-046 (name 軸分解)
- DR-060 (補完クエリ意味論、responsibility 4層)
- DR-042 (installer 5不変則、matcher の座席)
- DR-038 (bounded path-search のパース意味論契約)
- DESIGN.md §15 (パース挙動全般)

## 受け入れ条件

- [ ] A群 (greedy マーク / matcher データ / 効果記述子 / repeat 匿名id / 一意性 / pending 状態) の各論点に決定が付き、新規 DR (DR-061 以降を想定) または既存 DR 拡張として記録される
- [ ] B群 (F-042 invariant、F-048 lifecycle) が解消され、findings 2026-06-29-ast-missing-pieces.md の該当2件がクローズ可能になる
- [ ] C群 (fixture フォーマット) が確定し、フェーズ2 (fixture 蒸留) に着手可能な仕様書 (DESIGN.md 追記 or 新規 docs/ ファイル) が揃う
- [ ] メタ論点 (DR-039 defer 条件充足の確認) に決着が付く
