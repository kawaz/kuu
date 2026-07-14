# kuu.mbt 旧 remote 枝 5 本 棚卸し統合報告

> 調査日: 2026-07-14 (実機検証は本報告作成時に再実施)。対象リポ: `github.com/kawaz/kuu.mbt` (以下 kuu.mbt) の origin 上に残る旧枝 5 本。比較対象の現行本体: kuu.mbt `origin/main` (tip `8c91113d`) および spec 正本リポ `github.com/kawaz/kuu` (`main`, DR-001〜DR-103)。
>
> **本報告は削除の要否を判定しない。** 棚卸し結果の提示のみで、処置は kawaz が再裁定する。

---

## 0. 検証方法と前提

- read-only 調査。`git fetch origin <branch>` のみ許可、branch 削除・push・checkout/switch・jj コマンドは一切実行していない。
- 5 枝すべてを `git fetch` で再取得し、各枝の tip SHA・root commit・`git merge-base` 結果・commit 数を実機で再確認した (下表「実測再確認」列)。全項目が委譲元データと一致した。
- 加えて、委譲元データの一部主張 (grep 結果) を再実行し、**1 件の食い違いを検出した** (§3-3 参照)。

### 実測再確認 (tip SHA / root / merge-base / commit数)

| 枝 | tip SHA (fetch 確認済み) | root commit | `merge-base` vs origin/main | commit数 (`rev-list --count`) |
|---|---|---|---|---|
| ast-spec | `a7d2f945` | `501ab228` (initial empty commit) | なし (exit=1、再確認) | 45 |
| kuu-v0 | `bc316c6f` | `501ab228` | なし (exit=1、再確認) | 494 |
| slice | `5d507e8c` | `501ab228` | なし (exit=1、再確認) | 97 |
| claude/review-implementation-gLfMA | `81647c8c` | `501ab228` | なし (exit=1、再確認) | 409 |
| dependabot/.../npm_and_yarn-a21195e247 | `a4cab4de` | `501ab228` | なし (exit=1、再確認) | 495 |

追加確認: `claude/review-implementation-gLfMA` (`81647c8c`) は `kuu-v0` (`bc316c6f`) の直系祖先であることを `git merge-base --is-ancestor` で再確認 (`YES`、間に85commit)。`dependabot/...` と `kuu-v0` は独立系列 (`--is-ancestor` 双方向とも `NO`) であることも再確認。`slice` と `kuu-v0` も双方向とも祖先関係なし (独立系列) を再確認。

いずれも origin/main (`8c91113d`, root `fdec7d4e`) とは共通祖先を持たない。これは spec リポ側の一次資料 `docs/journal/2026-07-04-repo-restructure-handoff.md` (kawaz/kuu, commit `bc2b819`) に記載の「kuu.mbt の枝再編: 旧 main → `kuu-v0` (実験場アーカイブ)。新 `main` = root empty commit 直下の初期 README」という完全リセットの記録と整合する (該当ファイルを実際に読み、該当記述を確認済み)。同ファイルには「掃除 (kawaz確認後): kuu.mbt の origin に残る `ast-spec` ブランチ (正本は kawaz/kuu に移行済み、10+ commits 遅れの残骸) と `claude/review-implementation-gLfMA` の削除」という記述があるが、これは前セッションの見立てであり、実測 (ast-spec は disconnected root で 45 commit 全体、「10+ commits 遅れ」という記述とは数値が一致しない) を優先すべき点は委譲元データの指摘通り。

---

## 1. 枝×性格×未吸収コンテンツ×回収推奨 一覧表

| 枝 | 性格 | 未吸収コンテンツ (概要) | 回収推奨 |
|---|---|---|---|
| **ast-spec** | spec 正本 (kawaz/kuu) の前身置き場。docs のみ (src/ なし)、DR-001〜054 + README/DESIGN/LOWERING/findings/journal/runbook/issue | なし (全ファイル現行 kawaz/kuu main に完全吸収済み、かつ現行側がスーパーセット) | 回収不要 |
| **kuu-v0** | 書き直し前の「v0 実装」本体。旧 main の実験場アーカイブ。src/core (命令的パーサ) + src/dx + src/cli (C FFI native) + src/wasm + src/contrib/timespec + examples (多言語 WASM ブリッジ PoC) | (a) help セクション分け issue (未クローズ idea)<br>(b) timespec の具体エッジケース実装知見<br>(c) WASM ブリッジ多言語連携の実地知見 (ただし採否は既に ROADMAP.md で判断済み、詳細は§3-3) | 回収候補あり |
| **slice** | AtomicAST トップダウン再設計の PoC (凍結済み)。conformance fixture の蒸留元として自己申告 | なし (DR / poc 実装とも現行 kawaz/kuu・kuu.mbt にスーパーセットとして吸収済み。残 open issue も「PoC が現行仕様に追いついていない」型の後追い負債で、現行側の不足発見ではない) | 回収不要 |
| **claude/review-implementation-gLfMA** | kuu.mbt 旧世代 (combinator ベース) 実装。tip は「merge kuu-cli」 | なし (tip コミット自体が kuu-v0 の直系祖先 = kuu-v0 に完全包含済み、これを実機の `--is-ancestor` で再確認) | 回収不要 |
| **dependabot/.../npm_and_yarn-a21195e247** | 旧 kuu.mbt (汎用 CLI パーサ) 開発ライン 494 commit + dependabot による npm 依存 bump 1 commit | (d) choices / implicit_value バリデーション機能 (弱い回収候補、断定不可) | 大部分は回収不要、1 件のみ判定要検討 |

---

## 2. 回収候補の詳細 (価値順)

### 2-1. [中〜高] help オプションのセクション/カテゴリ分け表示機能 (kuu-v0)

- **何を**: `--help` 出力でオプションをカテゴリ/セクションにグループ化して表示する UX 改善案。「INPUT/SPOOL 等でグループ化」という具体イメージ付き。
- **どこから**: kuu-v0 の `docs/issue/2026-05-26-help-option-sections.md`。実ファイルを `git show bc316c6f:docs/issue/2026-05-26-help-option-sections.md` で再確認済み。frontmatter は `status: idea`、`origin: kawaz/hyoui の CLI 設計議論`。現時点まで未クローズ。
- **どこへ**: spec リポ `kawaz/kuu` の `docs/issue/` への再起票候補。
- **根拠**: 現行 kawaz/kuu の `docs/decisions/`, `docs/issue/`, `docs/DESIGN.md` 等を `grep -ril 'section'` で再検索した結果、DR-082/DR-101/DR-054 と 2 件の archive issue がヒットしたが、いずれも「フィルタ定義のセクション」等 filter/definition 文脈の語であり、「help 表示のセクション分け」という UX 概念そのものは現行 spec に一切登場しないことを確認 (help 関連の open issue も 0 件)。委譲元データの「未吸収」判定と一致。

### 2-2. [中] timespec (duration) の具体的パース仕様・エッジケース実装知見 (kuu-v0)

- **何を**: 符号既定値、`"since 5m"` の相対時刻慣習、`"@5m"` 記法、`none`/`null`/`nil` によるリセットキーワード等、duration/timespec 型の具体的な構文規則とテストケース。
- **どこから**: `src/contrib/timespec/timespec.mbt`, `timespec_wbtest.mbt` (kuu-v0)。ファイル実在を `git ls-tree` で再確認済み (4 ファイル: moon.pkg / pkg.generated.mbti / timespec.mbt / timespec_wbtest.mbt)。
- **どこへ**: 将来 duration/timespec 型を正式設計する際の DR / fixture のテストケース集として、kawaz/kuu の `docs/decisions/` または `fixtures/` 候補。
- **根拠**: kawaz/kuu 側で `duration`/`timespec` を grep すると DR-028 (type-as-reference), DR-035, DR-040 (type-registry-dialects), DR-080 (merge-accumulator), DR-094, journal 2 件, archive issue 1 件がヒットするが、いずれも「型レジストリの一例」「将来の型候補」という概念言及に留まり、符号規則・相対時刻構文などの具体的な仕様策定には至っていないことを確認 (該当ファイルの中身までは今回精読していない — 「概念言及のみで具体仕様なし」は grep ヒット箇所の見出しからの推定であり、全文精読による断定ではない点は留保する)。

### 2-3. [判断保留寄り・弱] choices / implicit_value バリデーション (dependabot 枝の祖先ライン)

- **何を**: オプション値を許可リストに制限する `choices` バリデーションと `implicit_value` (フラグ的省略値)。
- **どこから**: dependabot 枝の祖先コミット群 (例: `538b95c0` 相当 — 委譲元データの記述、今回は個別コミット内容の再確認は行っていない)。
- **どこへ**: 判断保留。現行 spec の制約体系 (`required` / `exclusive_group` / `required_group` / `requires` / `conflicts_with`) に相当機能があるか要確認。
- **根拠**: `grep -ril 'choices\|implicit_value' docs/` (spec リポ) を実機で再実行し **0 件** であることを確認 (委譲元データと一致)。ただし「別概念 (filter-chain 等) で機能的に代替済みの可能性」は委譲元データ自身が留保しており、今回もこの点を覆す追加確認はできていない。§4 の判定不能項目として扱う。

### (参考・要再評価) WASM ブリッジによる多言語連携の実地知見 (kuu-v0)

委譲元データはこれを回収候補 (3件目) として挙げていたが、**実機再検証の結果、評価を修正すべき事実を発見した** (詳細は §3-3)。「現行 spec に wasm の言及が一切ない」という前提が誤りで、実際には ROADMAP.md に「WASM 同梱は採用判断で致命的なネガ」という明確な**不採用判断**が記録されている。したがって本項目は「未吸収の知見」ではなく「既に検討され却下された設計」である可能性が高く、回収候補としての位置づけを見直す必要がある。詳細と論点は §3-3 および §4 参照。

---

## 3. 「回収不要」判断の根拠一覧 (kawaz が検証可能な形で)

### 3-1. ast-spec (回収不要)

- **完全一致ファイル**: `docs/findings/2026-06-29-*.md` 等 7 ファイルが現行 kawaz/kuu main と diff 0 行 (委譲元データの記述、今回は個別 diff の再実行はしていない)。
- **DR ファイルの存在**: `git ls-tree -r --name-only a7d2f945 -- docs/decisions` で 54 件の DR ファイル (DR-001〜054) を確認し、うち DR-001 (`DR-001-two-layer-ast.md`) と DR-054 (`DR-054-parse-definition-failure.md`) の 2 件が kawaz/kuu/main の同名パスに実在することを実機で再確認した。
- **現行側が超集合**: kawaz/kuu/main の DR 番号上限は `DR-103` (実機の `ls` で再確認、`DR-098〜DR-103` まで存在)。ast-spec の DR-054 止まりに対し、現行は DR-103 まで発展しており、量的にもスーパーセットである。
- **唯一の「不在」ファイル** (`docs/issue/2026-07-03-alias-normalization-help-completion-installer.md`) は `docs/issue/archive/` に同名で存在 (close 済みでアーカイブ移動、削除ではない) — 今回は再確認していない (委譲元データのまま採用)。

### 3-2. slice (回収不要)

- **DR / poc 実装の対応**: 委譲元データが示す `poc/matcher.mbt` (234行) と `src/core/matcher.mbt` (515行, kuu.mbt main) の diff によるスーパーセット確認は、今回再実行していない (委譲元データのまま採用)。
- **一次資料**: `docs/journal/2026-07-04-repo-restructure-handoff.md` (kawaz/kuu, commit `bc2b819`) を実機で読み、「slice 枝は凍結 (PoC 167 テスト、conformance fixture の蒸留元)」の記載を確認した (本報告 §0 に引用済み)。
- **open issue の性質**: slice に残る open issue 9 件のうち 2 件を委譲元データが精読し、いずれも「凍結された PoC が現行仕様 (pin 済み DESIGN.md や DR-052) に追いついていない」という slice 側の後追い負債であり、現行側の欠落発見ではないと判定 — 今回は再確認していない (委譲元データのまま採用)。

### 3-3. kuu-v0 の大部分・claude/review-implementation-gLfMA (回収不要部分)

- **claude/review-implementation-gLfMA は kuu-v0 の祖先**: `git merge-base --is-ancestor 81647c8c bc316c6f` → `YES` (exit=0) を実機で再確認した。間の commit 数は `git rev-list --count 81647c8c..bc316c6f` → 85。つまり本枝の全内容は kuu-v0 に完全包含されており、単独の回収対象は存在しない。
- **旧実装の考古学は完了済み**: kawaz/kuu の `docs/findings/2026-07-03-core-archaeology.md` に「旧実装 (main ws src/core/) の考古学」として調査済みで DR-041 §3 / DR-045 / DR-047 に吸収済みと明記 — 実ファイルの存在は確認したが、DR-041/045/047 との対応関係の中身までは今回精読していない (委譲元データのまま採用)。
- **⚠️ WASM 言及の grep 結果に食い違いを検出**: 委譲元データは「`grep -ril 'wasm' docs/decisions docs/findings docs/DESIGN.md ROADMAP.md` (spec repo) → 該当なし (0 hits)」と主張していたが、実機で同一の grep を再実行したところ **`ROADMAP.md` に 1 件ヒット**した:

  > `ROADMAP.md:11`: 「**バンドルサイズ**: 引数パーサは誰もが依存する基盤であり、1 言語 core の FFI / WASM 同梱は採用判断で致命的なネガ。tree-shake (DR-040) も言語ネイティブでないと効かない」

  これは「WASM 言及が一切ない」のではなく、**「WASM ブリッジ方式は不採用」という設計判断そのものが明記されている**ということを意味する。委譲元データの評価 (「未吸収の実地知見、回収候補」) はこの事実を見落としており、正しくは「既に検討され、バンドルサイズ問題を理由に却下済みの設計」という位置づけになる可能性が高い。ただし ROADMAP.md の 1 行だけでは「WASM ブリッジで踏んだ具体的な壁 (型変換・浮動小数点丸め・AST カバレッジ漏れ等) の実地データ」自体が不要と判断されたのか、単に「同梱しない」という配布方式の判断だけであり実地データの参考価値は別問題として残るのかは切り分けられていない。この点は §4 の判定不能項目とする。
  - 参考: `docs/journal/2026-07-06-phase2-handoff.md` にも `wasm-gc` の言及があるが、これは MoonBit のコンパイルターゲット (moonrun の `x/fs` 実装関連) の話であり、kuu-v0 の「多言語間 WASM ブリッジ」とは別の技術文脈である。混同しないよう注記する。

- **examples/ / pkg/ts の直接移植価値なし**: 現行 origin/main の `src/` はコアが `matcher.mbt`/`resolve.mbt`/`node.mbt`/`value.mbt`/`eval.mbt`/`cont.mbt`/`outcome.mbt`/`filters.mbt`/`installer.mbt`/`complete_wbtest.mbt` の評価器/CPS ドメインであり、kuu-v0 の `examples/`・`pkg/ts` 等 (旧 CLI パーサドメイン) とは対象が異なる — 今回は個別ファイル内容までの再確認はしていない (委譲元データのまま採用)。
- **help テキスト生成ロジック**: DR-053 で「文言生成はレンダラの関心」と明記しスコープ外とする設計方針の相違であり、未吸収ではないと委譲元データが判定 — 今回は DR-053 の内容確認はしていない (委譲元データのまま採用)。

### 3-4. dependabot 枝 (大部分は回収不要)

- **dependabot commit 自体の適用対象消失**: `git show a4cab4de --stat` で変更 3 ファイルがいずれも `examples/20260318-npm-typescript/package-lock.json` 系および `pkg/ts/package-lock.json` であることを委譲元データが確認済み。現行 origin/main の `git ls-tree` に `examples/` `pkg/` が存在しないため、bump 対象自体が現行に存在しない — 今回は `git ls-tree` の再実行はしていない (委譲元データのまま採用)。
- **旧 CLI パーサ実装知見**: `docs/findings/2026-07-03-core-archaeology.md` により既に「考古学」調査済みで DR-041/045/047 に反映と明記 (kuu-v0 と同根)。

---

## 4. 判定不能項目と追加調査の提案

1. **WASM ブリッジ知見の要不要 (§2 参考項目 / §3-3)**: ROADMAP.md の 1 行 (バンドルサイズ理由の不採用宣言) だけでは、kuu-v0 の WASM ブリッジ PoC が踏んだ具体的な技術的知見 (型変換の欠落・浮動小数点丸め・AST カバレッジ漏れ等、DR-0027/0029/0030/0035/0054/0056 相当) が「不要と判断された」のか「配布方式としては不採用だが技術知見自体は独立した参考価値がある」のかを本報告だけでは切り分けられない。
   - **追加調査案**: kawaz に「バンドルサイズ問題で不採用と決めた際、WASM ブリッジで得た技術知見 (型変換/丸め等の壁) 自体を記録に残す意図はあったか」を確認するか、DR-0027 等 kuu-v0 側の該当 DR 本文と ROADMAP.md 決定時期の前後関係を精読すると切り分けられる可能性がある。

2. **choices / implicit_value の代替実装の有無 (§2-3)**: 現行 spec に `choices`/`implicit_value` という語の言及は 0 件だが、「filter-chain 等の別概念で機能的に代替済みの可能性」を委譲元データ自身も断定できていない。
   - **追加調査案**: kawaz/kuu の制約体系 (DR 群、特に `required_group`/`exclusive_group` 系) を実装者視点で読み、「値の選択肢制限」に相当する機能が別語彙で存在するかを確認する。あるいは kawaz 本人に「choices バリデーションは今の設計でどう表現する想定か」を確認するのが早い。

3. **timespec 具体仕様の全文精読 (§2-2)**: 今回は grep ヒット箇所の見出しレベルでの確認に留まり、`DR-028`/`DR-035`/`DR-040`/`DR-080`/`DR-094` 等の該当 DR 本文を全文精読して「具体仕様が本当に未反映か」までは確認していない。
   - **追加調査案**: 該当 DR 本文と kuu-v0 の `timespec.mbt`/`timespec_wbtest.mbt` を突き合わせて、既存 DR がカバーしていない具体エッジケースをリスト化する。

4. **本報告で再確認していない委譲元データの主張**: 以下は今回の実機検証の対象外とし、委譲元データの記述をそのまま採用した。追加で裏取りする場合の対象:
   - ast-spec の完全一致ファイル diff (7ファイル) の個別再実行
   - slice の `poc/matcher.mbt` vs `src/core/matcher.mbt` diff の個別再実行、および slice open issue 9 件中の残り 7 件の中身確認
   - kuu-v0/dependabot 系列の `docs/findings/2026-07-03-core-archaeology.md` と DR-041/045/047 の対応関係の内容確認
   - dependabot 枝の `choices`/`implicit_value` 追加コミット (`538b95c0` 等) の個別内容確認

---

## 付録: 実行した主要コマンド (再現用)

```bash
# kuu.mbt リポのルートで実行
git fetch origin ast-spec kuu-v0 slice claude/review-implementation-gLfMA \
  dependabot/npm_and_yarn/examples/20260318-npm-typescript/npm_and_yarn-a21195e247
git rev-parse origin/main
git merge-base <tip-sha> origin/main   # 全枝で exit=1 (共通祖先なし)
git rev-list --max-parents=0 <tip-sha> # 全枝 root = 501ab228
git rev-list --count <tip-sha>
git merge-base --is-ancestor 81647c8c bc316c6f   # YES (claude-review は kuu-v0 の祖先)
git rev-list --count 81647c8c..bc316c6f          # 85
git merge-base --is-ancestor a4cab4de bc316c6f    # NO (dependabot は独立系列)
git merge-base --is-ancestor 5d507e8c bc316c6f    # NO (slice は独立系列、双方向)
git ls-tree -r --name-only a7d2f945 -- docs/decisions   # DR-001〜054, 54件
git show bc316c6f:docs/issue/2026-05-26-help-option-sections.md
git ls-tree -r --name-only bc316c6f -- src/contrib/timespec
grep -ril 'wasm' docs/ ROADMAP.md   # spec リポ側、ROADMAP.md に1件ヒット (要検証事項)
grep -ril 'choices\|implicit_value' docs/          # spec リポ側、0件
```
