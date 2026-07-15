# DR-108: spec リリースプロセス — VERSION バンドルと v1.0.0 発行条件の確定

> 由来: `docs/findings/2026-07-13-v1-readiness-audit.md` の V1-R16/V1-R17/V1-R18 (spec リポにリリース機構が存在しない) と V1-R20 (DR-068 §1「fixture 全 pass」と DR-069 の「parse-core が準拠の最小条件」の関係が未裁定) を解消する。kawaz 裁定 **V1-Q1 = b** (2026-07-14、`docs/QUESTIONS.md` 経由) は DR-104 冒頭で既に一度反映されているが、DR-068/DR-069 間の緊張自体を裁定する DR は未起票だった。本 DR がその正式記録を兼ね、リリース機構 (VERSION ファイル + `.github/workflows/release.yml` + justfile task) を実体化する。

## 決定

### 1. バージョニング対象は spec バンドル一体 (DR-068 §2 の実体化)

単一の `VERSION` ファイル (リポジトリルート) が `DESIGN.md` + `LOWERING.md` + `CONFORMANCE.md` + `REFERENCE.md` + `docs/decisions/` (DR コーパス) + `fixtures/` + `schema/*.json` の一体を代表する。DR-068 §2 が「Schema 単独でバージョンしない」と定めた単位をそのまま実体化する — 一部ファイルだけの改版という状態は作らない。

### 2. VERSION ファイル + kawaz 標準 release ループの採用

kuu は他の kawaz リポ (`kawaz/bump-semver` が canonical 実装) と同じ標準ループに乗る:

```
VERSION を bump (just bump-version) → main へ push (just push)
  → .github/workflows/release.yml が VERSION 変更を検知
  → semver gate (latest-release / latest-tag 双方を上回ることを検証)
  → tag + GH Release を作成 (release body に fixture プロファイル別内訳を自動集計)
```

**人も AI も `git tag` / `jj tag` を打たない、`gh release create` を手で叩かない** (kawaz 恒久禁則、`release-flow-awareness` rule)。kuu は spec-as-core でバイナリ等のビルド成果物を持たないため、bump-semver 自身の release.yml から `build` / `update-homebrew` ジョブを除いた縮小形を採る — `check-version` (semver gate) → `validate-bundle` (schema/descriptor lint + fixture 全 JSON 構文 + プロファイル別集計の不変量検査) → `release` (tag + GH Release、fixture 内訳を release notes に含める) の 3 ジョブ構成。

**権限とサプライチェーンの最小化** (codex レビュー #5 C-1 の反映): workflow 全体は `permissions: contents: read` を既定にし、`release` job のみ `contents: write` を持つ。`actions/checkout` は `persist-credentials: false` で、取得した資格情報が後続ステップに漏れないようにする。`bump-semver` の取得は `releases/latest` の可変 URL でなく**固定バージョン**を参照する。sha256 のハード pin は不採用 (供給元が kawaz 自身のリポであり、read-only checkout + 資格情報非保持の組で現実的な露出は covered と判断、DR 採用しなかった案参照)。

**並行実行の直列化** (M-1): `concurrency: {group: kuu-release, cancel-in-progress: false}` を workflow 全体に設定し、複数 push が同時に `check-version` を bootstrap 通過する race を防ぐ。加えて `release` job の `gh release create` 直前に同 tag の存在を再確認する (concurrency は同一 workflow 間の race を防ぐが、外部操作や過去 run との TOCTOU には最終 recheck が要る)。

**bootstrap 判定の fail-closed 化** (M-2): `latest-release`/`latest-tag` の非ゼロ終了を無条件に「まだ何もない」とみなさない。stderr のメッセージ内容 (`no semver-compatible ...`) で「本当に空」と「gh subprocess/認証/network エラー」を区別し、後者は release を止める (fail closed)。`bump-semver` 現状の exit code はこの 2 ケースを区別しない制約があり、上流 (`kawaz/bump-semver`) への改善提起は別途行う (本 DR の射程外)。

v1.0.0 未満 (ドラフト期、DR-068 §1) の release は GitHub の **prerelease** フラグを立てる。v1.0.0 到達時点で prerelease でない正式 release に切り替わる — この区別自体がドラフト期/確定後の状態を GitHub 上で可視化する。

### 3. V1-Q1 = b の正式記録: DR-068 §1 と DR-069 の関係

**DR-068 §1 の「conformance fixture を green にした時」は、DR-069 の 4 プロファイル (parse-core / lowering / definition-error / completion) 全ての green を指す。** DR-069 §1 の「parse-core green が kuu 準拠を名乗る最小条件」という記述は**個別実装が「kuu 準拠」を名乗れる最小条件**であり、**spec バンドルが v1.0.0 を発行できる条件** (本項) とは別軸の基準である。両者は以下のように独立に併存する:

- 実装は parse-core プロファイルの fixture が green であれば「kuu 準拠 (parse-core)」を名乗れる (DR-069 §1、opt-in プロファイルは実装ごとに任意)
- spec バンドル自体が v1.0.0 として確定するには、**4 プロファイル全ての fixture が指定参照実装 (`kuu.mbt`) で green** であることを要求する — 仕様が実証されたと呼べるのは、仕様が規定する全クエリ形態 (parse / lower / definition_error / complete) が実装で動く姿を見せた時点だから (DR-068 の spec-as-core の筋そのもの)。**指定参照実装は `kuu.mbt` に固定する** (「少なくとも 1 つの参照実装」のような曖昧な言い回しは不採用、codex レビュー #5 M-4 の反映) — 将来複数実装が育ってどれを基準にするか変わる場合は、その変更自体を新規 DR で行う (無断で基準実装を差し替えない)

この整理により、DR-068 §1 の無限定な文言と DR-069 の opt-in 規定は矛盾でなく**「実装への要求レベル」と「spec 発行条件」の階層分離**として両立する。DR-068 本文・DR-069 本文それぞれに本 DR への明確化 note を追記済み (本文の「決定」自体は書き換えない、ドラフト期の判断経緯として維持)。

**green の規範と証跡** (M-4): 「green」が意味する内容 (全 file decode・全 case 実行・skipped=0・mismatches=0・対象 spec commit SHA 固定) は CONFORMANCE.md §0.1 に規定する。v1.0.0 発行時は、この規範を満たしたことを示す machine-readable な証跡ファイル (`docs/releases/v1.0.0-evidence.md` — spec commit SHA / kuu.mbt commit SHA / プロファイル別 fixture 件数・skipped・mismatches) を `docs/runbooks/v1-release.md` の手順で作成し、`release.yml` の `validate-bundle` job が `VERSION >= 1.0.0` の場合にその存在を検証する (中身の意味検証までは行わない軽量 gate — 存在しなければ release を止める)。「main branch protection や protected environment の承認」のような重い gate は本サイクルでは採らない (下記「採用しなかった案」参照)。

### 4. 参照実装の対応宣言の形

kuu.mbt (参照実装) 側の実作業は本 DR の射程外だが、対応の**形**を以下に定める:

- kuu.mbt の CI は spec の特定 commit (SHA) を pin して追従する (spec 側が VERSION を bump しても、kuu.mbt 側が明示的に pin を更新するまでは新版を追わない — 破壊的変更を伴う仕様更新から実装を守る境界)
- kuu.mbt の README (または相当箇所) は「spec vX.Y.Z 準拠 (4 プロファイル conformance 全 green)」の形で宣言する。spec バージョンとプロファイル達成状況の組が実装側の準拠宣言 (DR-069 §1 の「実装は spec バージョン + 準拠プロファイルの組を宣言する」の実体)
- pin 更新 + 準拠宣言の更新は kuu.mbt 側の commit/PR の責務であり、本 DR はその形を規定するのみで実行しない

### 5. schema `$id` の対象範囲は JSON Schema 3 ファイルのみ (M-6)

`$id` (DR-068 §4 のバージョン付き URI) を付与するのは **`schema/wire.schema.json` / `schema/fixture.schema.json` / `schema/descriptor.schema.json` の 3 ファイル**に限る。`schema/builtin-descriptors.json` は JSON Schema ではなく registry 住人の宣言データ (data document、`descriptor.schema.json` に適合する側) であり、envelope の `additionalProperties: false` が `$id` を許可しない (`$comment`/`$schema-ref`/`filters`/`types`/`providers` のみ許可)。`builtin-descriptors.json` の側は既存の `$schema-ref` フィールド (現状はドラフト期の repo 相対パス `"descriptor.schema.json"`) を、確定後は `descriptor.schema.json` の確定 `$id` (バージョン付き URI) へ更新する — envelope schema 自体は変更しない。

### 6. v1.0.0 の発行は本サイクルの射程外

本 DR はリリース**プロセス**の整備であり、v1.0.0 の**発行**そのものとは別の作業である。本サイクルでは `VERSION` を `0.1.0` から開始する (ドラフト期の最初のバンドル発行、prerelease)。v1.0.0 への bump は `docs/runbooks/v1-release.md` のチェックリスト全項目が完了した時点で行う — 現時点では 4 プロファイルのうち completion (DR-104) の fixture 実体化状況・参照実装側の green 状況の最終確認が済んでいないため、時期尚早に v1.0.0 を打つと「発行してから条件不足が発覚する」逆順になる。

## 採用しなかった案

### 文書と fixture の別バージョン化

DR-068 §2 で既に却下済みの案 (「Schema の独立バージョニング」) だが、リリース機構の実装時に再検討する価値があるため改めて記録する。VERSION を `DESIGN.md` 用と `fixtures/` 用で分けると、「spec vX.Y.Z 準拠」という宣言が指す対象が曖昧になり、DR-068 §2 が防ごうとした「バインディングの参照管理の複雑化」がそのまま再発する。単一 VERSION の維持を継続する。

### 手動 tag 運用 (`git tag` / `jj tag` を人が打つ)

kawaz の恒久禁則 (`release-flow-awareness` rule) に反する。CI が `VERSION` の変更を検知して tag + Release を自動生成する形以外は採らない。

### 本サイクルでの v1.0.0 即時発行

readiness audit (V1-R09/R11 等) が示す残 gap (definition-error fixture 5 種欠落、installer descriptor 未実体化等) は v1.0.0 発行条件そのもの (4 プロファイル green) には直結しないものもあるが、`docs/runbooks/v1-release.md` のチェックリストを経ずに VERSION を 1.0.0 に飛ばすと、$id 更新・DESIGN §0.1 宣言文更新等の発行時必須作業が漏れるリスクがある。プロセス整備 (本 DR) と発行実行 (runbook 経由) を分離する。

### protected environment (承認必須) による v1.0.0 gate

GitHub の environment protection rule (release 前に人の承認を必須にする仕組み) は v1.0.0 発行の最終防波堤として機能するが、kuu は個人が単独で保守する spec リポであり、承認者を追加設定する運用コストが実際のリスク低減に見合わない (codex レビュー #5 M-4)。`validate-bundle` job の証跡ファイル存在チェック (機械的 gate) で代替する — 将来 co-maintainer が増える等で運用コストが下がれば再検討する。

### `$id` を builtin-descriptors.json にも付与する

M-6 (codex レビュー #5) で検討: `schema/descriptor.schema.json` の envelope は `additionalProperties: false` で `$comment`/`$schema-ref`/`filters`/`types`/`providers` のみ許可しており、`$id` を正式に許可するには envelope schema と `lint-descriptors.py` の両方を変更する必要がある。`builtin-descriptors.json` は「registry 住人の宣言データ」であり JSON Schema そのものではない (`$schema-ref` で descriptor.schema.json への準拠を宣言する data document) という既存の位置づけに合っているため、$id 拡張ではなく **`$schema-ref` の値をバージョン付き URI に更新する**案 (上記決定 5) を採用する。

## 射程外

- kuu.mbt 側の CI pin 実装・README 準拠宣言文言の実作業 (§4 は形の規定のみ)
- schema 3 ファイル (`wire`/`fixture`/`descriptor`) の `$id` バージョン付き URI のホスト確定 (`docs/runbooks/v1-release.md` が発行時のチェック項目として扱う、DR-068 §4 が既に「具体ホストは発行時に確定」と規定)
- v1.0.0 発行チェックリストの詳細手順 (`docs/runbooks/v1-release.md` が正本)
- V1-R11 (DESIGN.md/CONFORMANCE.md への DR-069 プロファイル定義の転記) — 本 DR とは別 commit で実施 (DESIGN §15.14 / CONFORMANCE §0 新設)

## 関連

- DR-068 (JSON Schema と spec バージョンの lifecycle — §1 に本 DR への明確化 note 追記)
- DR-069 (準拠プロファイル — 関連節に本 DR への参照追記)
- DR-104 (complete fixture format — V1-Q1=b を最初に反映した箇所、本 DR が正式な DR として裏書き)
- `docs/findings/2026-07-13-v1-readiness-audit.md` (V1-R16/R17/R18/R20、V1-Q1 の発端)
- `docs/runbooks/v1-release.md` (v1.0.0 発行チェックリスト — 本 DR が定めたプロセスの実行手順)
- `release-flow-awareness` rule (claude-rules-personal) — tag/release は Claude が打たない恒久方針
- 参考実装: `kawaz/bump-semver` の `release.yml` / `justfile` (`push` / `bump-version` / `watch` タスクの canonical パターン)
