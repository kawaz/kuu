# kuu completion glue (bash) — DR-117 §4 行文法 + env プロトコル (§3)
#
# テンプレ変数 ({{...}}) は spec templates/README.md を参照。
# 実装リポは vendoring 時に literal 置換する。
#
# 対象 shell: bash 4.4+ (fully-featured) / bash 3.2 (macOS 同梱、縮退経路)
# 完成度: 骨格 (実機検証は M4。TRANSLATION.md status 参照)

_{{PROGRAM_NAME}}() {
  local uuid={{UUID}}
  local binary={{BINARY}}

  # words / cword 素材 (TRANSLATION.md words/cword)
  # COMP_WORDS は COMP_WORDBREAKS で `--flag=value` 等が [--flag, =, value] へ割れる。
  # 応答契約 (DR-117 §3.4) は「shell が見ている行の全量トークン列」なので、
  # 割れたトークンは glue 側で再結合する (bash-completion 系の定石)。
  # TODO(M4): 再結合ロジックを実機検証 — 現状は素の COMP_WORDS を渡す骨格。
  local -a words=("${COMP_WORDS[@]}")
  local cword="${COMP_CWORD}"

  # 形態 A: env プロトコル (DR-117 §3.1)
  local response
  response=$(
    KUU_COMPLETE="$uuid" \
    KUU_COMPLETE_INDEX="$cword" \
      "$binary" "$uuid" bash "${words[@]}" 2>/dev/null
  ) || return 1

  # 応答 parse (DR-117 §4)
  local line insert desc flags flag
  local -a cand_insert nospace_insert shell_actions
  local any_nospace=0
  while IFS= read -r line; do
    [[ -z $line ]] && continue                    # 空行は無視 (§4.4)
    if [[ $line == :* ]]; then
      case "${line#:}" in
        shell_action\ *) shell_actions+=("${line#:shell_action }") ;;
        # 未知 directive は無視
      esac
      continue
    fi
    # 候補行: insert \t desc \t flag1 \t flag2 ...
    insert="${line%%$'\t'*}"
    if [[ $line == *$'\t'* ]]; then
      local rest="${line#*$'\t'}"
      desc="${rest%%$'\t'*}"
      if [[ $rest == *$'\t'* ]]; then
        flags="${rest#*$'\t'}"
      else
        flags=""
      fi
    else
      desc=""; flags=""
    fi
    cand_insert+=("$insert")
    if [[ -n $flags ]]; then
      # bash 3.2 は IFS 分割で対応 (readarray -d は 4.4+)
      local old_ifs="$IFS"
      IFS=$'\t'
      for flag in $flags; do
        case $flag in
          nospace) nospace_insert+=("$insert"); any_nospace=1 ;;
          # 未知フラグ無視
        esac
      done
      IFS="$old_ifs"
    fi
  done <<< "$response"

  # 順序保持: bash 4.4+ は compopt -o nosort、3.2 は縮退 (sort されるが受容)。
  # bash 3.2 は complete -F 内 compopt に nosort オプションが無いため、順序を諦める。
  # TODO(M4): compopt の可用性判定を bash version 直接判定でなく機能検出で書き直す。
  if compopt +o filenames >/dev/null 2>&1; then
    compopt -o nosort 2>/dev/null || true          # 4.4+ で有効、3.2 は失敗して無視
  fi

  # nospace: 応答内に nospace 候補があれば関数単位で立てる。
  # per-candidate nospace は bash 標準枠組みでは正確に表現できない (DR-117 §4.1
  # の per-candidate 情報の bash 側粗さ — 関数単位への丸めが妥当な縮退)。
  if (( any_nospace )); then
    compopt -o nospace 2>/dev/null || true
  fi

  # 候補提示 (COMPREPLY へ)
  COMPREPLY=()
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local ins
  for ins in "${cand_insert[@]}"; do
    COMPREPLY+=("$ins")
  done

  # shell_action directive → shell 既存機能への委譲。
  # bash では COMPREPLY へ追加する形で表現。
  local action name
  for action in "${shell_actions[@]}"; do
    name="${action#shell_action }"
    name="${name%% *}"
    case $name in
      files)
        while IFS= read -r ins; do COMPREPLY+=("$ins"); done < <(compgen -f -- "$cur")
        ;;
      dirs)
        while IFS= read -r ins; do COMPREPLY+=("$ins"); done < <(compgen -d -- "$cur")
        ;;
      # 未知 name は無視
    esac
  done

  return 0
}

complete -F _{{PROGRAM_NAME}} {{PROGRAM_NAME}}
