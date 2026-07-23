# DR-118: 段階型契約と Ambiguous の resolve 遷移 — parse/resolve の 2 相を型で強制、interpretation ビューは parse 相

> 由来: 敵対的レビュー統合台帳 (`docs/findings/2026-07-24-fresh-eyes-adversarial-review.md`) の
> B3 (parse/resolve の 2 相契約の濁り) と REV-Q3=a 裁定 (kawaz 2026-07-24: 段階型で強制 +
> Ambiguous の resolve 意味論と interpretation ビューの適用相を DR で裁定)。設計プランは
> `docs/findings/2026-07-24-api-polish-2-plan.md` §2。DR-053 (outcome 構造) / DR-104 §5 (相区分) /
> DR-109 (interpretations は resolve 非適用) を前提とし、DR-053 §3 へ明確化 note を追記する。

## 決定

### 1. 段階型契約 — output は resolve 済みの結果だけを受理する

parse 相と resolve 相の産物を**別の型**で表し、相を跨ぐ受け渡しを型で強制する。概念シグネチャ
(DR-115 §1.3 と同じ位相 — 言語側 API の字面の規範化ではなく、契約の存在の確定):

```
parse(atomic, args, sources?) → ParsedOutcome
  ParsedOutcome   = success(parsed_bindings)
                  | failure(errors, fired_action?, help_entry?, tried_triggers?)
                  | ambiguous(interpretations, help_entry?)

resolve(atomic, parsed_bindings, args, sources?) → ResolvedOutcome
  ResolvedOutcome = success(resolved_bindings)
                  | failure(errors, ...)          — resolve 相の失敗 (DR-047 §4) の転落先

output(atomic, resolved_bindings) → 結果射影 (result / effects / sources)
```

- `parsed_bindings` は **CLI 由来の生 binds** (parse 相の直接出力、値源ラダー未適用) の
  ハンドル。`resolved_bindings` は値源ラダー適用済み。**`output` (最終 wire 表現の組み立て)
  が受理するのは `resolved_bindings` のみ** — 「resolve を飛ばして出力する」誤用経路
  (env/config/default が黙って抜け落ちた結果を wire に出す) を言語の型検査で塞ぐ
- 各言語実装で両者を同一の内部表現 (binding 列) で持つのは自由だが、**公開 API 面では
  別の名義型として区別する**。DR-053 §1 の「canonical は構造、見せ方は DX」は outcome の
  wire 構造の話であり、本節は API 面の受け渡し規律 — 両者は矛盾しない (wire に
  parsed/resolved の型名は現れない)
- `resolve` の入力は ParsedOutcome 全体ではなく success payload (`parsed_bindings`)。
  旧契約 (kuu.mbt `resolve(ast, outcome, ...)`) の「Failure / Ambiguous はパススルー」挙動は
  段階型では**型ごと消える** — failure / ambiguous からの前進はそれぞれの分岐で扱う
  (failure は終端、ambiguous は §2)
- parse / resolve が同じ値源 (`sources` = env / config / tty provider 群) を受けるのは相区分
  (DR-104 §5) の帰結: parse 相も遅延述語の bool-target 判定 (DR-047 §5) で値源を読む。
  同じ値を 2 回渡す字面の冗長は、値源を 1 つの束で表す言語 API 設計 (実装の関心) で吸収する

### 2. Ambiguous からの前進は「解釈を 1 つ選んで resolve」の遷移 API

```
resolve_interpretation(atomic, interpretation, args, sources?) → ResolvedOutcome
```

- ambiguous の各 interpretation は parse 相の完全経路 1 本分の bindings を運ぶ (DR-053 §3)。
  利用者が **1 つを選んで** `resolve_interpretation` へ渡すと、その解釈の bindings に値源
  ラダーを適用した ResolvedOutcome を得る — 以降は §1 の success 経路と同じ (output へ進める)
- **どの解釈を選ぶかの基準は利用者の関心** (先頭を取る / 対話で選ばせる / エラーとして
  終了する)。kuu は選好を与えない — interpretations の列挙は集合的で順序が同一性成分でない
  (DR-053 §3) 以上、「最初の解釈」のような順序依存の既定を仕様が置く座席が存在しない
- 解釈の resolve 失敗は通常経路と同じ Failure 転落 (DR-047 §4「評価対象は値源ラダー充填後の
  最終状態」の一様適用)。collision 昇格 (DR-073) 由来の解釈が運ぶ env/config/inherit の
  共露出 bindings も、この遷移でそのまま resolve 対象になる

### 3. interpretation ビューは parse 相までを適用した姿 (規範化)

DR-053 §3 の「各解釈は結果オブジェクト形のビュー」の適用相を確定する: **ビューは parse 相
までを適用した姿であり、値源ラダー (resolve 相) は適用しない**。DR-109 の「interpretations は
resolve 非適用」の方向出しを、以下の 3 規則込みで規範化する (参照実装
`kuu.mbt src/kuu/front_door.mbt` の `output_of_interpretation` と、interpretations を持つ
既存 fixture 全数・conformance runner の現行 posture の追認 — 既存 fixture の期待値は変わらない):

1. **Default-source scalar の除外**: interpretation 自身の bindings が運ばない
   default 由来の scalar 値はビューに載せない (解釈間で差が出ない席はノイズ)
2. **claimants 席の default は残す**: DR-073 §1 の claimants に載る key の default 値は、
   衝突の provenance (どの解釈がそのキーを占めるか) を読むために残す
3. **空 accumulator 配列は残す**: multiple 要素の空配列は解釈の構造として保持する
   (構造の輪郭は解釈の同一性を読む材料)

### 4. なぜ parse 相止まりか (論拠)

ambiguous の解消前に値源ラダーを適用すると、解釈間で claimants の占有が異なるため
「どの解釈の席にラダーを注ぐか」が解釈ごとに分岐する。ビューは「差分が一目で分かる」
(DR-053 §3) ための**比較面**であり、比較面には全解釈で一様に計算できる相 (parse 相) しか
使えない。ラダー適用後の姿が見たければ選んでから `resolve_interpretation` する — これは
相区分 (DR-104 §5「dead end 判定は parse 相、制約評価は resolve 相」) の一様適用であって
新しい規則ではない。DR-109 が「途中経過を規定せず最適化余地を保つ」とした余地は §3 の
3 規則で消費するが、これは既存 fixture が既に暗黙に pin していた挙動の追認であり、
実装の自由度を新たに奪うものではない。

## 採用しなかった案

### 1 発 API (parse_and_resolve) を canonical にする

parse 相の outcome 骨格だけ欲しい場面 (debug / 部分的な取扱 / fuzz) と完全 wire を
組み立てる場面を型で区別できなくなる。相区分 (DR-104 §5) が spec の背骨である以上、
API 面もこれに従う。呼び出し側便宜のラッパーを言語 DX が足すのは自由 (禁止しない)。

### output が parsed_bindings も受ける (2 口受理)

「resolve を飛ばした出力」が型検査を素通りし、env/config/default の抜け落ちが silent に
wire へ出る — B3 の指摘した濁りの温存になる。parse 相だけの射影が要る場面 (§3 のビュー) は
`resolve_interpretation` 前の interpretation ビューとして既に座席がある。

### interpretation ビューに resolve 相を適用する

§4 の通り、解釈ごとにラダーの注ぎ先が分岐して「全解釈で一様な比較面」が成立しない。
また resolve 失敗を含む解釈のビューが表現不能になる (ビューは失敗を運ぶ形を持たない)。

### interpretations の列挙に選好順序を導入して「既定の解釈」を作る

完全経路間に優先関係がない (DR-038) ため順序源が原理的に存在しない。既定を作ると
「なぜこれが 1 番か」の規範を発明することになる (DR-053 §3 の裏返し)。

## 射程外

- **遷移の conformance 検証形式**: `resolve_interpretation` の入出力を fixture で pin するには
  「どの解釈を選んだか」を fixture が指す**解釈の同定子**が要るが、interpretations の列挙は
  順序非規範 (CONFORMANCE §3) のため index 参照が使えず、同定子の形 (claimants / result による
  構造指名等) は新規の設計になる。v1 の conformance は §1/§3 の既存検証面 (parse query の
  outcome 構造 + interpretation ビュー) で足りており、遷移自体の fixture 化は必要が実体化した
  時点の DR に委ねる
- 段階型の言語別の具体形 (opaque ハンドルか struct か、Result 変換等) は各言語実装の関心
- ambiguous を対話 UI でどう提示するかは DX / アプリの関心 (kuu-cli dogfooding サイクルの素材)

## 波及

- **DR-053 §3**: 明確化 note を追記 (ビューの適用相 = parse 相 + 3 規則、本 DR §3 参照)
- **CONFORMANCE §3**: interpretations 比較の行に「各解釈のビューは parse 相 + DR-118 §3 の
  3 規則を適用した姿」を明記
- **参照実装 (kuu.mbt)**: 玄関の段階型化 (ParsedOutcome / ResolvedOutcome、`output` の
  受理型変更、`resolve_interpretation` 新設) — API 磨き第 2 サイクル M2 (プラン §5)
- **DESIGN §15**: 玄関契約の記述を段階型シグネチャへ追随 (実装サイクルと同窓)

## 関連

- DR-053 (outcome 構造 — §3 のビュー規定の適用相を本 DR が確定)
- DR-104 §5 (相区分 — 段階型の背骨)
- DR-047 §4/§5 (遅延述語の評価相 — resolve 失敗の転落規則、parse 相の bool-target 判定)
- DR-109 (interpretations は resolve 非適用の方向出し — 本 DR §3/§4 が規範化)
- DR-073 (claimants — §3 規則 2 の出所)
- DR-038 (完全経路間に優先なし — 選好順序を置かない論拠)
- `docs/findings/2026-07-24-api-polish-2-plan.md` (設計プラン §2)
- `docs/findings/2026-07-24-fresh-eyes-adversarial-review.md` (B3 / REV-Q3 裁定)
