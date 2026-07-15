# v1.0.0 発行 runbook

> 適用前提: kuu spec が v1.0.0 (確定版) を発行する時、本チェックリストを上から順に実行する。DR-108 が定めたリリースプロセスの**発行時実行手順**であり、プロセス自体の設計判断は DR-108 を参照。
>
> **発行条件そのもの** (本 runbook を開始してよい前提): DR-068 §1 / DR-069 / DR-108 §3 (kawaz 裁定 V1-Q1=b) — 4 プロファイル (`parse-core` / `lowering` / `definition-error` / `completion`) 全ての conformance fixture が指定参照実装 (kuu.mbt) で CONFORMANCE.md §0.1 の green 規範 (全 file decode / 全 case 実行 / skipped=0 / mismatches=0) を満たす。1 項目でも未達なら本 runbook を開始しない。
>
> **順序の要点** (codex レビュー #5 M-7 の反映): 「公開状態が一時的に偽になる」区間を作らない。DESIGN/$id の最終化と VERSION bump は別 commit にするが、**両方を含めて 1 回の push で同時に main へ送る** — 「DESIGN が v1.0.0 発行済みと宣言しているが VERSION はまだ 0.x」という中間状態を origin 上に晒さない。

## チェックリスト

### 1. 作業開始前の前提確認

```bash
cd /path/to/kuu/main   # spec 側 workspace
jj status                                                                # working copy clean
jj log -r 'ancestors(@) & ~ancestors(main@origin)' --no-graph            # 空 = 未 push commit なし
just sync                                                                # origin/main に追従
```

未 push commit が残っていれば、それらを本 runbook の作業とは別に `just push` で先に main へ反映してから続行する (VERSION bump の commit と混ぜない)。

### 2. 4 プロファイル green の証跡を release candidate SHA に固定

参照実装 (kuu.mbt、新 main) 側で spec fixtures を実食する:

```bash
cd /path/to/kuu.mbt/main   # kuu.mbt の new main workspace
just test                  # KUU_FIXTURES 経由で kawaz/kuu の fixtures/ を実食 (moon test --target native)
```

出力の統括検証値で `decoded=<N> / ran_cases=<N> / skipped=0 / mismatches=0` を確認する — `skipped` / `mismatches` が 0 でないプロファイルは green ではない (CONFORMANCE.md §0.1)。4 プロファイルそれぞれの fixture が実食対象に含まれているか、spec 側の内訳とも突き合わせる:

```bash
cd /path/to/kuu/main   # spec 側
jq -r '.query' fixtures/**/*.json | sort | uniq -c   # プロファイル別件数 (release.yml validate-bundle と同じ集計方式)
```

**証跡ファイルの作成** (DR-108 §3 「green の規範と証跡」、M-4 の反映): `docs/releases/v1.0.0-evidence.md` を新設し、以下を記録する — この commit は次項 §3 の「準備 commit」に含める:

```markdown
# v1.0.0 conformance evidence

- spec commit SHA: <kuu 側の release candidate SHA (この runbook 実行中の @ の親、bump-version 前)>
- kuu.mbt commit SHA: <kuu.mbt 側で上記 spec commit を fixtures として実食した時の commit SHA>
- プロファイル別集計:
  | profile | files | cases | skipped | mismatches |
  |---|---|---|---|---|
  | parse-core | <N> | <N> | 0 | 0 |
  | lowering | <N> | <N> | 0 | 0 |
  | definition-error | <N> | <N> | 0 | 0 |
  | completion | <N> | <N> | 0 | 0 |
```

`release.yml` の `validate-bundle` job は `VERSION >= 1.0.0` の場合、このファイルの**存在**を要求する (中身の意味検証はしない軽量 gate — 存在しなければ release を止める)。中身の正しさは本項の手順を正しく踏んだことに依存する。

### 3. schema `$id` の更新 + DESIGN §0.1 の確定版宣言 (準備 commit)

**対象は JSON Schema 3 ファイルのみ** (DR-108 §5、M-6 の反映): `schema/wire.schema.json` / `schema/fixture.schema.json` / `schema/descriptor.schema.json`。`schema/builtin-descriptors.json` は JSON Schema でなく data document のため `$id` を追加しない (envelope の `additionalProperties: false` が拒否する) — 代わりに既存の `$schema-ref` フィールドを `descriptor.schema.json` の確定 `$id` に更新する。

DR-068 §4 の規定: 確定後は `$id` に `https://kuu.kawaz.org/schema/<version>/wire.json` 形式のバージョン付き URI を与える (具体ホストは発行時に確定、本 runbook の実行時点で下記から選び kawaz へ確認する — 裁定なしで進めない):

| 候補 | 特徴 |
|---|---|
| GitHub raw (`https://raw.githubusercontent.com/kawaz/kuu/v1.0.0/schema/wire.schema.json`) | 即座に使える。tag 名がそのまま URL に乗るためバージョンごとの永続 URL が自動で手に入る。反面 URL が長く GitHub 依存が URL に露出する |
| GitHub Pages (`https://kawaz.github.io/kuu/schema/1.0.0/wire.json`) | 独立ドメイン感のある短い URL。Pages 有効化 + デプロイ workflow の追加セットアップが要る |
| 独自ドメイン (`https://kuu.kawaz.org/schema/1.0.0/wire.json`) | 最も安定 (GitHub 依存を URL から切り離せる)。ドメイン取得・DNS・ホスティングの追加運用コストが発生 |

更新後の検証 (不一致は必ず exit 1 — M-6 の反映、選択した host/version と URI パターンの一致も検査する):

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSION="1.0.0"
HOST_PATTERN='^https://kuu\.kawaz\.org/schema/'   # 選択した host に合わせて書き換える

fail=0
for f in schema/wire.schema.json schema/fixture.schema.json schema/descriptor.schema.json; do
  id=$(jq -r '.["$id"] // empty' "$f")
  if [ -z "$id" ]; then
    echo "[FAIL] $f: \$id 未設定"; fail=1; continue
  fi
  if [[ "$id" != *"$VERSION"* ]] || ! [[ "$id" =~ $HOST_PATTERN ]]; then
    echo "[FAIL] $f: \$id ($id) が version=$VERSION または host パターンと不一致"; fail=1; continue
  fi
  echo "[OK] $f: $id"
done

ref=$(jq -r '.["$schema-ref"] // empty' schema/builtin-descriptors.json)
if [[ "$ref" != *"$VERSION"* ]] || ! [[ "$ref" =~ $HOST_PATTERN ]]; then
  echo "[FAIL] builtin-descriptors.json: \$schema-ref ($ref) が確定版 URI になっていない"; fail=1
else
  echo "[OK] builtin-descriptors.json: \$schema-ref=$ref"
fi

[ "$fail" -eq 0 ]   # 不一致があれば非ゼロ終了
```

**DESIGN §0.1 の確定版宣言**: 「本仕様は垂直スライス実装との共設計段階にあり、全域で破壊的変更を許容する (ドラフト期)。...」の文言を確定を明示する文言に書き換える。例:

> 本仕様は v1.0.0 (確定版) を発行した。以降の変更は DR-068 §3 の semver 規則に従う (意味論変更・語彙削除・改名は major、語彙追加は minor、文書明確化・fixture 追加は patch)。

上記 schema 更新 + DESIGN 更新 + `docs/releases/v1.0.0-evidence.md` (§2) をまとめて **1 つの準備 commit** にする (`jj commit -m "..." schema/*.json docs/DESIGN.md docs/releases/v1.0.0-evidence.md`)。**この時点ではまだ push しない** — VERSION bump commit と合わせて次項で同時に送る。

### 4. VERSION を 1.0.0 へ bump

```bash
just bump-version major   # 0.x.y -> 1.0.0 (semver の major bump は minor/patch を 0 にリセットするため、0.x.y からの major bump は必ず 1.0.0 になる)
cat VERSION                # 1.0.0 になっていることを目視確認
```

これで「準備 commit (§3)」→「VERSION bump commit (本項)」の 2 commit が working copy に積まれた状態になる。

### 5. 1 回の push で同時に main へ送る

```bash
just push   # release.yml が起動、tag + GH Release (prerelease フラグなし) を作成
```

準備 commit と VERSION commit を分けて作った理由は意味単位の分離のためであり、**push 自体は 1 回にまとめる** — 「DESIGN が v1.0.0 発行済みと宣言しているのに VERSION がまだ 0.x」という中間状態を origin 上に一切晒さないため (M-7)。

push 後の監視 — `watch-workflow.sh` (gh-monitor plugin) が使えない環境では `gh` 標準コマンドで代替する (m-2):

```bash
just watch
# watch-workflow.sh が無い/使えない場合の fallback:
gh run list --repo kawaz/kuu --workflow=release.yml --limit 1
gh run watch --repo kawaz/kuu "$(gh run list --repo kawaz/kuu --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

### 6. post-release 検証

`release.yml` が success で完了した後、以下を確認する (M-7):

```bash
# (a) v1.0.0 Release が非 prerelease であること
gh release view v1.0.0 --repo kawaz/kuu --json isPrerelease -q '.isPrerelease'   # false であること

# (b) tag の target SHA が push した tip と一致すること
gh release view v1.0.0 --repo kawaz/kuu --json targetCommitish -q '.targetCommitish'
jj log -r 'main@origin' --no-graph -T 'commit_id'   # 上と一致することを確認

# (c) Release notes の 4 profile count が期待値と一致すること (目視 + §2 の証跡ファイルと突合)
gh release view v1.0.0 --repo kawaz/kuu --json body -q '.body'

# (d) versioned $id URI が実際に解決できること (選択した host に応じて curl 対象を変える)
curl -fsSL "$(jq -r '.["$id"]' schema/wire.schema.json)" | jq -e '.["$id"]'
```

**不整合時の recovery**: (a)〜(d) のいずれかが不整合でも、**人は `git tag` / `jj tag` / 手動 `gh release create` を一切使わない** (kawaz 恒久禁則、`release-flow-awareness` rule)。原因を workflow / VERSION / schema の修正で解消し、必要なら `gh workflow run` での再実行、または新しい patch バージョン (`v1.0.1` 等) の commit → push で再発行する。tag/Release を直接操作する recovery は選択肢に入らない。

### 7. kuu.mbt 側の pin 更新と準拠宣言 (参考、本 runbook の実行対象外)

kuu.mbt (参照実装) 側の作業。spec 側からは実行しない (DR-108 §4 の「参照実装の対応宣言の形」の実体化):

- kuu.mbt の CI pin を spec v1.0.0 の commit SHA (または tag) へ更新
- kuu.mbt の README に「spec v1.0.0 準拠 (4 プロファイル conformance 全 green)」を追記

## 関連

- DR-108 (本 runbook が実行するプロセスの設計、§3 の green 規範と証跡・§5 の $id 対象範囲)
- DR-068 §4 (`$id` lifecycle)、DR-069 (準拠プロファイル定義)
- CONFORMANCE.md §0/§0.1 (プロファイル定義・green の規範)
- DESIGN.md §0.1 / §15.14 (現役仕様反映)
