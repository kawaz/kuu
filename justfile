# kuu justfile
#
# kuu は仕様正本リポ (docs 中心、ビルド/リリース成果物なし)。
# task は push 経路のみ。VCS 操作は bump-semver vcs に委譲する。
# workflow (.github/) を持たないため watch 系 task は無い。

set shell := ["bash", "-euo", "pipefail", "-c"]

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

# fail if the current bookmark / branch is not the default
[private]
check-on-default-branch:
    bump-semver vcs is on-default-branch

# ---------- push flow ----------

# push default branch (main) to origin
push: check-on-default-branch ensure-clean
    bump-semver vcs push --branch "$(bump-semver vcs get default-branch)" --jj-bookmark-auto-advance

# 現在の worktree を default branch (= origin/main) に rebase
sync:
    bump-semver vcs sync --onto $(bump-semver vcs get default-branch)@origin

# secondary workspace の change を default branch bookmark に forward (push はしない)
promote:
    bump-semver vcs promote
