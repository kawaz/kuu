# DR-086 (values 消費優先 cut) 起草から values decode 完遂・regex_match 実装までの夜サイクル

夜の kawaz 裁定 3 波を起点に、DR-086 (values positional 同居時の値スロット消費優先 cut) の
起草と評価層への設計転換、values decode 完遂 (issue `values-decode-support` close)、fixture
記述漏れ 2 波の是正、regex_match 実装 (issue `regex-match-filter` close) までを通したサイクルの
記録。

## kawaz 裁定 3 波 (夜)

### (a) 遡及確認 3 件、全承認

DR-084/DR-085 の colon 案・greedy 案の棄却を含む遡及確認 3 件、kawaz が全承認。

### (b) values positional 同居 → DR-086 (値スロット消費優先 cut)

`values-variant-branch-competition` で保留していた positional 同居 case について kawaz 裁定:
「食える分は食う、positional に残すのはありえない」。これを **値スロット消費優先 cut** として
定式化し DR-086 に起草した — values 制約下の `:set` (値スロット) は、後続に positional が
控えていても greedy に消費し切る。positional に「残す」余地を作らない、という優先順位の明文化。

### (c) regex compile 失敗の扱い、初答を kawaz 自身が訂正

regex compile 失敗の扱いについて、初答は「マッチしなかった扱い」だった。これを kawaz 自身が
訂正し、definition-error (kind=**invalid-argument** 新設、DR-054 更新2 / DR-082 §3) に切り替えた。
このやり取りで「鵜呑みにせず考えてから動け」の指摘を team-lead が受けた — 初答の字面をそのまま
優先し、「方言依存だから定義時検査にしない」という逆理屈を DR に後付けしてしまっていたことへの
反省。訂正後は「compile 可否は定義時に静的検査できる (実行時の入力値に依存しない)」という
筋が通った理由に差し替えた。

## DR-086 実装の設計転換

当初案は `Cut(Node, Node)` を lowering 層に入れる案だった。worker が実装に着手したところ、
`lowering/long/variant.json` (greedy 衛星の個数・形を pin している既存 fixture) と正面衝突する
ことを検出し、独断で進めず停止報告した。

report を受けて評価層 (`scope_step` の 2 パス) への転換で決着した。cut 判定は **継続を含まない
浅い評価** でなければならない — 深い評価で判定すると、後続 positional の飢え (starvation) を
先読みしてしまい、DR-086 §1 が禁じているはずの「positional に残す」判断を判定ロジック自体が
行ってしまうバグになる。この bug は worker が実機で検出した。

commit: spec `a3230016` (DR-085 訂正 + DR-086)。

## values decode 完遂 (issue values-decode-support close)

`BEnum` の消費構造を確認する過程で、worker が既存の or value-enum が「制約収集のみで消費構造に
未反映」だった事実を発見した。糖衣 (values) と正規形 (or) の意味論を割らないよう、両者を
同一の消費経路に合流させる修正を行った (DESIGN §5.3 準拠 — 糖衣は正規形の別記法であって別の
意味論を持たない、という既存原則の再確認)。

skip ledger の 3 エントリが全解消。conformance: decoded=174 / ran_cases=453 / skipped=0 /
mismatches=0。

## fixture 記述漏れ 2 波

### (a) verbose の type:"flag" 明記漏れ

verbose fixture で `type: "flag"` の明記が漏れていたケースを是正する過程で、type 省略時の
既定型が正本に未規定だと判明した。spec issue `typeless-option-default-semantics` を起票し、
kawaz 裁定バッチへ送った。

### (b) 未発火 flag の default:false present 漏れ + optional positional の sources 漏れ

DR-051 §2 (absent 表現の一様形) に照らして、未発火 flag の `default:false` に対する `present`
フィールドの記述漏れと、optional positional の `sources` フィールドの記述漏れを発見・是正した。
`default-cell-ops` と同型の 3 例目。

commit: spec `e9ab0fd8` (type:flag) → `5622ad1f` (present 漏れ)。

## regex_match 実装 (issue regex-match-filter close)

core `Regex` wrapper を使って実装。オブジェクト形式の decode は暫定的に U+E000 タグによる
in-band encode で対応した。この in-band 方式の潜在的な穴 (タグ文字がユーザ入力パターン中の
リテラルと衝突しうる余地) を issue `filter-spelling-inband-encoding-retyping` として起票し、
将来の型付き retyping での解消を追跡する。

定義時 compile 検査 (`DInvalidArgument`) を実装し、上記 (c) の裁定 (compile 失敗は definition-error)
を反映した。

commit: spec `2bb72f27` (invalid-argument fixture 群)、kuu.mbt `d7909136` (regex) →
`788b8374` (compile 検査)。

## ハマり所

- worker が `\x00` (NUL バイト) をソースファイルに書き込んでしまい、`filters.mbt` がバイナリ
  扱いされる事故が発生。自力復旧し、タグ文字を U+E000 へ変更した。
- `json.dump` による fixture の一括整形が既存 fixture の手書きフォーマット (キー順・改行位置)
  を破壊した。`jj restore` で巻き戻し、最小限の `Edit` に切り替えて再修正した (team-lead 自身の
  失敗)。
- メッセージ交錯が多数発生。msg_id 言及付きの再送で都度再同期した。

## 実装側 commit まとめ

kuu.mbt: `d7909136` (regex) → `788b8374` (compile 検査) → `83d154ba` (values decode + cut)。
全 CI green。

## 深夜追補: FilterSpelling 再設計と conformance 語彙拡張

### FilterSpelling 再設計完遂 (issue filter-spelling-inband-encoding-retyping close)

上記の U+E000 in-band encode が抱えていた潜在穴 (タグ文字がユーザ入力パターン中のリテラルと
衝突しうる余地) を、`Array[String]` → `FilterSpelling` (name+args) への再型付けで解消した。
影響ファイル 8 本、U+E000 in-band encode を全削除。args 値中に U+E000 literal が生存する
wbtest を追加し、穴が完全に閉じたことを pin した。観測挙動は不変で conformance 全 green。

commit: kuu.mbt `7c80a55f`。

### CONFORMANCE §2/§3 語彙拡張 (issue conformance-tried-triggers-help-entry-fields close)

DR-053 §4 が予約していた `help_entry` (failure/ambiguous、構造等価比較) と `tried_triggers`
(failure のみ、集合比較・順序非規範) を opt-in フィールドとして語彙化した。DR-053 §4 の後追い
実装にあたる。

設計分析は opus47 worker に委譲、裁定 5 点のうち 4 点 (ambiguous 経路への同時対応 / opt-in
時の null 不要 / failure-actions 配置 / 命名) は既存正本から team-lead が導出裁定した。残る
「dd 綴り `--` の混在可否」のみ kawaz 裁定バッチへ送った。

commit: spec `dd445aa3`、kuu.mbt `bf5e5402`。

### fixture が実バグを即検出

新設 fixture `tried-triggers-scope.json` が、`find_help_entry` が root scope に固定されたまま
だった (= 子スコープの help 入口を見逃す) バグを検出した。`tried_triggers_of` は commit
`e43facd7` で既に直っていたが、help 側だけが非対称のまま取り残されていた。失敗位置のスコープを
基準に修正した。ambiguous 経路は失敗位置そのものを持たないため root 全体のままとした
(意図的な区別)。

### 本日の消化まとめ

issue: spec 5 close + kuu.mbt 5 close、新規起票 3 (`values-decode-support` は即日 close /
`filter-spelling-inband-encoding-retyping` は即日 close / `typeless-option-default-semantics`
は kawaz 裁定バッチへ)。

conformance 基準: decoded=175 / ran_cases=455 / skipped=0 / mismatches=0。moon test 203 本。

## 関連

- DR-086 (`docs/decisions/DR-086-values-consumption-priority-cut.md`、値スロット消費優先 cut)
- DR-054 更新2 / DR-082 §3 (definition-error kind=invalid-argument)
- issue `values-variant-branch-competition` (DR-086 起草元、close) / `values-decode-support`
  (values decode 完遂、close) / `regex-match-filter` (regex_match 実装、close) /
  `typeless-option-default-semantics` (open、kawaz 裁定バッチ行き) /
  `filter-spelling-inband-encoding-retyping` (open、U+E000 タグの潜在穴追跡)
- 前回 journal: `2026-07-10-dr083-recovery-dr084-dr085-cycle.md`
- spec commit: `a3230016` → `2bb72f27` → `e9ab0fd8` → `5622ad1f`
- kuu.mbt commit: `d7909136` → `788b8374` → `83d154ba`
