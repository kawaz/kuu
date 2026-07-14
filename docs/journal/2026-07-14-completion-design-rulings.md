# 2026-07-14 complete fixture 系統の設計裁定ラッシュ

前日の complete fixture 系統の棚卸し調査 (`docs/findings/2026-07-13-complete-fixture-recon.md`)
で挙がった COMP-Q1〜Q5 の裁定バッチと、それに続く COMP-Q4 の掘り下げ調査、そして基底語彙
`argv` そのものの採否まで転回した命名論争を、DR-102/DR-103 サイクルと並行してさばいた日。

## docs/QUESTIONS.md 運用の新設

前日 (`docs(QUESTIONS): 裁定待ち一覧ファイル新設 (ラベル索引 + 運用規約、現在待ちの 13 Q で
初期化)`) から、kawaz への裁定待ち事項をチャット提示と同時に `docs/QUESTIONS.md` へ集約する
運用が始まった。裁定が下りたら該当セクションを削除し、裁定内容は DR/issue/journal 等の本来の
記録先に反映する — 「現在待ちの質問だけを持つ」ファイルとして、この日は一日を通して SPL-Q・
RG-Q1・COMP-Q 系のバッチ提示と決着の削除が何度も往復した。

## COMP-Q1〜Q5 の裁定

complete fixture 系統の設計 (入力フィールド名・候補メタの検証方針・completer 名の扱い・path
の扱い・7 op 表との無関係性の明示可否) について、`docs(QUESTIONS): COMP-Q1〜Q5 裁定反映
(Q2=meta必須/Q3=opt-in検証/Q5=許可)` で一括決着。`candidates[].meta` は候補同一性の成分ゆえ
必須検証、completer 名フィールドは wire に持たせつつ fixture では「書けば検証」の opt-in、
「7 op 表とは無関係」の明示文は書いてよい、という線に落ち着いた。詳細は
`docs/findings/2026-07-13-complete-fixture-recon.md` §5 参照。

## COMP-Q4 の掘り下げ: 候補同一性と制約×補完の非対称

COMP-Q4 は当初「候補 dedup の path 無視は spec pin か」という小さな確認のはずが、統括の
調査で 2 つの独立した論点に分岐した。1 つ目は **候補同一性・dedup 規則の spec 空白の確定** —
DESIGN §15.13 / DR-060 / DR-066 / DR-073 のいずれにも dedup 規則の規定が存在せず、kuu.mbt
実装が `spelling/is_value/ty/origin/term/meta` の完全一致・`path` 除外という規則を独自に
pin していることが判明した。2 つ目は **制約 (遅延述語) と補完の相互作用の非対称の発見** —
`after` 無指定 (行末補完) では遅延述語が候補生成に一切参加しないのに対し、`after` 指定あり
(行中補完) では間接的に遅延述語込みの完全解決チェックが働いてしまう、という spec 上どこにも
明記されていない非対称が見つかった。

kawaz の方向出し (team-lead 経由) は「制約は complete の候補生存判定に不参加」で統一。
「補完では通してもよいのかもしれない、排他確定候補も補完には出し、実行時のエラー (説明チャネル
がある側) で落とす方が親切、実装も重い」という理由づけで、DR-097 が採用した「dead end 判定は
parse 相、制約評価は resolve 相」という相区分を DR-047 の教義 (遅延述語は完全解決経路の成立
条件、評価対象は最終状態) の一様適用として素直に解消した形になった。指定述語 (`exclusive_group`/
`conflicts_with`) 限定で「committed 集合は単調だから before 段階でも一部の違反は証明可能」と
いう単調性分析も検討されたが、対象/非対象述語の非対称ルールを生成器実装者が覚える負担・unset
留保による実装複雑化・説明チャネル論点が上回ったため不採用に終わった。詳細は
`docs/findings/2026-07-14-completion-constraint-and-identity.md` 参照。

## 命名の転回: before/after → argv_before/after → argv 不採用 → args 統一

complete クエリの入力フィールド名は当初 `before`/`after` (DESIGN §15.13 のシグネチャ語彙) と
`argv` 再利用の 2 案があったが、COMP-Q1b で `argv_before`/`argv_after` (+ word 系も
`word_before`/`word_after` の系統命名) に決着した。ところがこの決着を kawaz に提示したところ、
「before/after の対象が何か分かりにくい — 前後の引数？ word 中の前後？」という不満が出て、
基底語彙 `argv` 自体の妥当性調査 (`docs/findings/2026-07-14-argv-vocabulary-survey.md`、C/Python
から MoonBit 標準ライブラリの `argparse` パッケージまでの言語横断マトリクス) に発展した。

調査の結論 (COMP-Q1c) は「argv 維持 + $0 非包含を明記」— MoonBit の `argparse` パッケージ自身が
`argv` という名で $0 抜きの引数列を渡す設計を採用している一次資料が最有力の後押しだった。しかし
この結論は kawaz 裁定で **覆った** (COMP-Q1d): 「悪いわけじゃないから良い、ではなく良い名前が
良い」— 調査が明らかにした「言語間で argv が $0 を含むかどうか割れている」という事実そのものが
曖昧語である証拠だと判断され、`argv` は不採用、`args` 系の語彙へ舵を切った。最終的に `args`
統一 + `word_before`/`word_after` を維持、既存の `argv`/`argv_pos` を `args`/`args_pos` に
改名する作業は issue `argv-to-args-rename` として次サイクルへ切り出し、`argv0` (プログラム名を
明示的に扱う preset 型の可能性) は issue `argv0-preset-type` として idea 起票にとどめた。

「言語横断調査で防御した語彙が、まさにその調査結果を理由に覆る」という逆転が印象的なサイクル
だった — 客観的な言語横断データが「argv は業界で確立した語」ではなく「argv は言語によって
意味が割れる曖昧語」であることを証明してしまい、防御していた側の論拠がそのまま攻撃材料に
転じた形になった。

## 関連

- `docs/findings/2026-07-13-complete-fixture-recon.md` (COMP-Q1〜Q5 の詳細)
- `docs/findings/2026-07-14-completion-constraint-and-identity.md` (COMP-Q4 の詳細)
- `docs/findings/2026-07-14-argv-vocabulary-survey.md` (argv 語彙調査、COMP-Q1c/Q1d の論拠)
- issue `argv-to-args-rename` / `argv0-preset-type` (次サイクル送り)
- `docs/QUESTIONS.md` (裁定待ち常時集約、この日から運用開始)
