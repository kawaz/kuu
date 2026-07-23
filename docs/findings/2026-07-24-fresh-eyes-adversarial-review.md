# 第三者ゼロ知識視点の敵対的レビュー統合台帳 (2026-07-24)

> 由来: kawaz 恒例指示「節目毎に、素人〜OSS オーナーのゼロ知識第三者が kuu を見にきたケースを想定し、
> 破壊的変更上等で全指摘を出し尽くす徹底レビュー」。4 ペルソナ並列 (素人アプリ開発者 / OSS オーナー・
> 上級者 / CLI UX 実務者 / ドキュメント目利き) で実施、全指摘に実出力・file 根拠あり。
> 本書は指摘の統合台帳。裁定が要る分岐は docs/QUESTIONS.md の REV-Q バッチへ、
> 裁定不要の修正は「やるだけリスト」(§4) へ振り分けた。

## 0. 総合判定 (4 ペルソナの結論)

| ペルソナ | 判定 |
|---|---|
| 素人アプリ開発者 | **使いたいか: No** (validate/exit code 破損 + 配布ゼロ + doc 難解)。ただし hello.json→parse は数分で動き「方向性は面白い」 |
| OSS オーナー (fable5) | **今日はベットしない — ただし筋が悪いからでなく semver 面の閉じ方が未了だから**。blocker 4 点を v1 前に直せば乗り換え候補 |
| CLI UX 実務者 | **PoC としては動く。公開できる水準でない**。最大の禁則 = dogfooding 未実装 |
| ドキュメント目利き | **胸を張れるか: No**。quickstart ゼロ + 英語入口の期待を裏切る導線 |

共通する背骨: **仕様・conformance 装置は本物 (clap/cobra に無い優位)。公開面 (API 面 / CLI UX / doc 導線) が
その水準に達していない。全て v1 前なら破壊コストゼロで直せる — v1 後では直せない。**

## 1. Blocker 級 (API 契約 — v1 前に閉じないと永久負債)

| ID | 指摘 | 根拠 | 出所 |
|---|---|---|---|
| B1 | **engine パッケージの pub(all) 全裸公開が semver 生存不能**。pub(all) 型 67 個 (ElementDef 66 フィールド / Node 18 variant / Entity mut 入り)。フィールド 1 個追加が破壊変更。kuu 玄関の戻り値自体が @engine.Outcome/Candidate/Binding を直輸出しており、後から閉じると玄関ごと破壊 — **閉じるなら今** | kuu.mbt src/engine/pkg.generated.mbti (L326/L617/L387)、front_door.mbt 冒頭コメントとの自己乖離 | veteran |
| B2 | **整数の値空間が Double 一枚**。int は 2^53 超で精度が黙って落ちる。DESIGN §3.3 L269 の「bigxx 型」は DR にも schema にも実体なし (v1 完備主義に自己抵触) | engine.Value = Number(Double)、DESIGN §3.3 | veteran |
| B3 | **parse/resolve の 2 相契約が濁っている**。parse が内部で resolve 相当を 1 回走らせ、利用者は同じ env/config/tty を resolve へ再供給 (doc comment が「冗長さはあるが」と自白)。「Ambiguous の resolve は未定」が doc comment に埋まり裁定キュー外。段階型 (ParsedOutcome→ResolvedOutcome) or 1 発 API の裁定要 | front_door.mbt L222-/L295- | veteran |
| B4 | **kuu-cli が dogfooding 未実装**。kuu を売る CLI が自分の argv を手書き parse (main.mbt L10 に自白コメント)。S2 群の多く (help 導線等) が仕様でなく実装者裁量で固まる構造要因 | kuu-cli impl/mbt/cli/src/main/main.mbt:10-11 | cli-ux |

## 2. High (公開前に直すべき — 大半は裁定不要の「やるだけ」)

### 2.1 kuu-cli の実装バグ / 慣習違反 (裁定不要、修正リスト §4 へ)

- H1 **validate が実質 no-op**: `type:"int"` (存在しない型) も `{}` も name 重複も ok:true。素人・UX 両レビューが独立に同観測 (2 ソース一致)。kuu.mbt の validate query 実装の検査範囲を追跡要
- H2 **exit code が README と不一致**: 読めないファイル / malformed JSON / parse 失敗が exit 0 (README は「Exit 1: parse/validate failure」)。CI 用途で致命
- H3 **`--help` が stderr へ出る** (`| less` が空)。ユーザ自発の help は stdout が慣習
- H4 **`<subcmd> --help` が動かない** (`--help` を def.json パスとして読もうとする)
- H5 **`--version` が無い** (VERSION ファイルはあるのに)
- H6 **help 出力に DR/findings 番号が 10 箇所以上** + completion 節だけ日本語の日英混在。interface-wording rule に自己違反
- H7 **stdin (`-`) 未対応** — スクリプト連携の標準経路が塞がっている
- H8 **`kuu` 引数なしが exit 2** (cli-design-preferences「引数なしは --help 表示」なら exit 0 が整合)
- H9 **bash glue に TODO 平文が焼き付いたまま出力される** (completion generate)

### 2.2 API 面 (veteran Major — 一部裁定要)

- H10 **registry の二重供給で desync 可能** (ast.extensions と引数 registry の同じことをする 2 つの口 + 引数順の揺れ)
- H11 **命名割れ**: Candidate.ty (省略形禁止に自己違反) / 補完系玄関 5 口の層が名前から読めない
- H12 **値源 3 つの供給形態が 3 様** (env=Map / tty=Map[TtyObs] / config=closure)。spec の provider 契約 (DR-049/050) と参照実装の形が乖離
- H13 **builtins factory の位置引数だらけ** (separated_arg 位置 8 個)。labeled 化は v1 後だと全破壊
- H14 **bool option が flag として発火せず値要求** (`--verbose` で missing_operand)。仕様どおりでも素人の第一の罠 — error hint で救うか糖衣の既定を見直すか

### 2.3 ドキュメント導線 (docs レビュー — 裁定不要、やるだけ)

- H15 **3 リポとも「Try it in 30 seconds」が無い。コピペで動く例ゼロ**
- H16 **英語 README の Layout 表のリンク先が全部日本語** — 「英語ゼロより悪い (期待を裏切る)」
- H17 kuu.mbt README 23 行 (使用例ゼロ)。kuu-cli README はマルチ実装の未来語りが現状 PoC を隠す
- H18 **内部運用ファイル (QUESTIONS.md/journal/findings) と外部向け文書の分離が無い**
- H19 README Layout 表に REFERENCE.md / ROADMAP.md が無い。$schema による JSON 編集補完の導線も無い

## 3. Medium / Low (台帳のみ、修正窓で拾う)

- M1 complete が prefix 途中入力 (`--po`) で候補ゼロ + なぜゼロかの trace 手段なし (素人・UX 双方観測。args-before の意味論説明不足と debug モード不在の複合)
- M2 canonical text renderer の `<VALUE>` プレースホルダが type 情報を活かさない / bool にも `<VALUE>` / 長行 wrap 規則なし
- M3 top-level help 48 行の壁 (2 段 help 化は H4 と表裏)
- M4 Unavailable が enum 側に混在 (Result で層分離の余地) / generate_completion_script の同型 4 連続位置引数
- M5 `spec_repo : String` pub let の存在価値不明
- M6 DESIGN 1532 行 + DR 117 本の分量がドメインサイズを超えて膨張していないか (バス係数 = 依存リスク)。「DESIGN を fixture への索引まで痩せさせる」方向の圧
- M7 3 リポの version 空間の関係が README 群のどこにも無い
- M8 fixture の why が日本語 — 「language-agnostic spec」の外部実装者参入障壁

## 4. やるだけリスト (裁定不要、修正サイクルの作業台帳)

kuu-cli: H2 (exit code) / H3 (help→stdout) / H4 (subcmd --help) / H5 (--version) / H6 (DR 番号除去+英語統一) / H7 (stdin) / H8 (引数なし exit 0) / H9 (TODO 焼き付き)
kuu.mbt: H1 (validate 実装の検査範囲拡充 — spec の definition-error 検査を validate 経路に配線)
docs: H15-H19 (quickstart 3 本 / Layout 表整理 / 内外分離 / kuu.mbt README 増強 / $schema 導線)

## 5. 裁定結果 (kawaz 2026-07-24、全問裁定済み)

- **REV-Q1=a**: 玄関型 (Outcome/Candidate/Binding/Warning 等) を kuu package 側の opaque/pub 型へ置き換え、engine は internal 化
- **REV-Q2=a+回収**: v1 は「int の保証精度は 2^53」を DESIGN/REFERENCE に明記 + 超過値は reject/warning。**bigint は core に入れず各言語実装側の拡張として個別実装** (1st party 提供の 3rd ライブラリ的立場で、拡張機構のデモを兼ねる)
- **REV-Q3=a**: 段階型で強制 (parse → ParsedOutcome / resolve → ResolvedOutcome / output は ResolvedOutcome のみ受理) + Ambiguous の resolve 意味論と「interpretation ビューは何相まで適用した姿か」を DR で裁定
- **REV-Q4=a**: kuu-cli dogfooding 書き直しを主タスク化、H2-H9 の慣習違反はその中で一括解消
- **REV-Q5=a**: API 磨き第 2 サイクルとして REV-Q1/Q3 の型置き換えと同窓で実施 (破壊 1 回)

B1 (engine 封鎖の方式) / B2 (int 精度の断定 or bigint) / B3 (parse/resolve 契約) / B4 (dogfooding の着手時期) /
H10-H14 の API 変更群 (まとめて API 磨き第 2 サイクルとするか)。

## 6. 評価されている点 (指摘とバランスを取る事実)

- conformance fixture + why + DR 遡及の三点セットは「clap/cobra に無い本物の優位」(veteran)
- hello.json → parse は数分で動く。structured output (effects/sources/warnings) は clap に無い良さ (novice)
- 曖昧性を Ambiguous + claimants で一級で返す設計は「clap の早い者勝ちで黙るより誠実」(veteran)
- fixture の質 (why が DR を引いて蒸留元まで明示) は高評価 (veteran)

## 関連

- 4 ペルソナの原報告はセッション内 (要旨は本書に統合済み)。再現用実出力は各指摘の根拠欄
- docs/QUESTIONS.md REV-Q バッチ (裁定待ち)
- 前回同種レビュー: 公開 API 磨きサイクル (docs/journal/2026-07-21-renderer-and-api-polish-cycle.md)
