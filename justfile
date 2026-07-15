# kuu justfile
#
# kuu は仕様正本リポ (docs 中心、バイナリ等のビルド成果物なし)。
# VCS 操作は bump-semver vcs に委譲する。VERSION bump → push が
# .github/workflows/release.yml の tag + GH Release 発行を駆動する
# (DR-108、kawaz 標準 release ループ — 人も AI も tag を打たない・
# gh release create を手で叩かない)。

set shell := ["bash", "-euo", "pipefail", "-c"]

set script-interpreter := ["bash", "-euo", "pipefail"]

# default behaviour: alias for `list`
default: list

# show the recipe list
list:
    @just --list --unsorted

# ---------- gates ----------

# working copy is clean
[private]
ensure-clean:
    bump-semver vcs is clean

# docs/REFERENCE.md が schema (wire.schema.json / builtin-descriptors.json) の語彙を過不足なく網羅しているか検査
lint-reference:
    ./scripts/lint-reference.sh

# schema/builtin-descriptors.json が schema/descriptor.schema.json (envelope) に適合し、
# key/name 一致・effect:preserve 不変量等の semantic 制約を満たすか検査 (DR-107、codex レビュー #4)
lint-descriptors:
    uv run --with jsonschema python3 ./scripts/lint-descriptors.py

# fail if the current bookmark / branch is not the default
[private]
check-on-default-branch:
    bump-semver vcs is on-default-branch

# ---------- release flow ----------

# bump VERSION (level: patch|minor|major, default: patch) and create a release commit (DR-108)
# level は allowlist 検証する (codex レビュー #5 m-1 — 未検証の shell 展開は release helper として避ける)
[script]
bump-version level="patch": ensure-clean
    case "{{ level }}" in
        patch|minor|major) ;;
        *)
            echo "error: level must be one of patch|minor|major (got: {{ level }})" >&2
            exit 1
            ;;
    esac
    bump-semver {{ level }} VERSION --write --quiet
    bump-semver vcs commit -m "Release v$(bump-semver get VERSION)" VERSION

# ---------- push flow ----------

# push default branch (main) to origin (schema/descriptor lint は常時 gate — VERSION 変更を伴わない日常 push も含む)
push: check-on-default-branch ensure-clean lint-reference lint-descriptors
    bump-semver vcs push --branch "$(bump-semver vcs get default-branch)" --jj-bookmark-auto-advance
    cmux-msg notify --self --text "Monitor で 'just watch' を起動して" 2>/dev/null || true

# release.yml の完了を SHA-pinned watch (push 後の `cmux-msg notify --self` で AI に起動指示が届く。VERSION 変更を伴わない push では release.yml 自体が発火しないため即終了する)。
# watch-workflow.sh (gh-monitor plugin) が無い環境では `gh run watch` にフォールバックする (codex レビュー #5 m-2)。
[script]
watch:
    sha=$(bump-semver vcs get commit-id --rev "$(bump-semver vcs get default-branch)")
    if command -v watch-workflow.sh >/dev/null 2>&1; then
        watch-workflow.sh --sha "$sha" kawaz/kuu
    else
        echo "[info] watch-workflow.sh not found (gh-monitor plugin); falling back to 'gh run watch'" >&2
        run_id=$(gh run list --repo kawaz/kuu --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')
        if [ -z "$run_id" ]; then
            echo "error: no release.yml run found for kawaz/kuu" >&2
            exit 1
        fi
        gh run watch --repo kawaz/kuu "$run_id"
    fi

# 現在の worktree を default branch (= origin/main) に rebase
sync:
    bump-semver vcs sync --onto $(bump-semver vcs get default-branch)@origin

# secondary workspace の change を default branch bookmark に forward (push はしない)
promote:
    bump-semver vcs promote
