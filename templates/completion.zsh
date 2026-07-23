#compdef {{PROGRAM_NAME}}
# kuu completion glue (zsh) — DR-117 §4 行文法 + env プロトコル (§3)
#
# テンプレ変数 ({{...}}) は spec templates/README.md を参照。
# 実装リポは vendoring 時に literal 置換する。
#
# 対象 shell: zsh (完成度優先。M2 の第一目標 — findings §4)
# 完成度: 骨格 (実機検証は M4 で行う。TRANSLATION.md status 参照)

_{{PROGRAM_NAME}}() {
  local uuid={{UUID}}
  local binary={{BINARY}}
  local cur_index=$((CURRENT - 1))   # zsh は 1-origin → 0-origin (TRANSLATION.md words/cword)

  # 形態 A: env プロトコル (DR-117 §3.1)
  #   KUU_COMPLETE=<UUID> KUU_COMPLETE_INDEX=<N> <binary> <UUID> <SHELL> <words...>
  # words は補完対象コマンド名を先頭に含む全量 (DR-117 §3.4)。
  local response
  response=$(
    KUU_COMPLETE="$uuid" \
    KUU_COMPLETE_INDEX="$cur_index" \
      "$binary" "$uuid" zsh "${words[@]}" 2>/dev/null
  ) || return 1

  # 応答 parse: candidate 行 (TAB 区切り) と directive 行 (`:` 始まり) を分離。
  # 未知 flag / 未知 directive は無視 (DR-117 §4 前方互換)。
  local -a cand_insert cand_desc cand_pairs
  local -a nospace_insert
  local -a shell_actions
  local line insert desc flags flag
  while IFS= read -r line; do
    [[ -z $line ]] && continue                    # 空行は無視 (§4.4)
    if [[ $line == :* ]]; then
      # directive 行
      case ${line#:} in
        (shell_action*)
          shell_actions+=("${${line#:shell_action }## }")
          ;;
        # 未知 directive は無視
      esac
      continue
    fi
    # 候補行: insert \t desc \t flag1 \t flag2 ...
    insert=${line%%$'\t'*}
    if [[ $line == *$'\t'* ]]; then
      local rest=${line#*$'\t'}
      desc=${rest%%$'\t'*}
      if [[ $rest == *$'\t'* ]]; then
        flags=${rest#*$'\t'}
      else
        flags=""
      fi
    else
      desc=""
      flags=""
    fi
    cand_insert+=("$insert")
    cand_desc+=("$desc")
    cand_pairs+=("${insert}:${desc}")             # _describe 形式
    # フラグ処理 (v1: nospace のみ、未知は無視)
    if [[ -n $flags ]]; then
      for flag in ${(s:$'\t':)flags}; do
        case $flag in
          nospace) nospace_insert+=("$insert") ;;
          # 未知フラグ無視
        esac
      done
    fi
  done <<< "$response"

  # 候補提示: 順序保持のため unsorted group + -V (TRANSLATION.md 順序保持行)
  # candidate 群と shell_action 群を並列に出す (DR-116 §2: 供給順を保つ)。
  if (( ${#cand_insert[@]} > 0 )); then
    # nospace 対象と非対象を別 group で出す (per-candidate nospace の zsh 表現)
    local -a normal_pairs ns_pairs
    local i n
    for (( i=1; i<=${#cand_insert[@]}; i++ )); do
      local ins=${cand_insert[$i]}
      local pair="${ins}:${cand_desc[$i]}"
      local is_ns=0
      for n in "${nospace_insert[@]}"; do
        [[ $n == $ins ]] && { is_ns=1; break; }
      done
      if (( is_ns )); then
        ns_pairs+=("$pair")
      else
        normal_pairs+=("$pair")
      fi
    done
    if (( ${#normal_pairs[@]} > 0 )); then
      _describe -V -t {{PROGRAM_NAME}}-candidates 'candidate' normal_pairs
    fi
    if (( ${#ns_pairs[@]} > 0 )); then
      # ns_pairs は insert:desc 形式。-d は display 用配列を求めるため、
      # `-- desc` 形の表示配列を別途組み立てて渡す (raw `insert:desc` を表示させない)。
      local -a ns_inserts ns_display
      # 注意: zsh の `local ins` は既に外側 for で ins が代入済みなので、値なし
      # 宣言だと `typeset` 互換で現在の binding (`ins=cherry` 等) を印字してしまう。
      # 初期値付きで宣言して回避。
      local p='' d=''
      ins=''
      for p in "${ns_pairs[@]}"; do
        ins=${p%%:*}
        d=${p#*:}
        ns_inserts+=("$ins")
        if [[ -n $d ]]; then
          ns_display+=("$ins  -- $d")
        else
          ns_display+=("$ins")
        fi
      done
      compadd -V {{PROGRAM_NAME}}-nospace -S '' -d ns_display -- "${ns_inserts[@]}"
    fi
  fi

  # shell_action directive → shell 既存機能への委譲
  local action
  for action in "${shell_actions[@]}"; do
    case $action in
      files) _files ;;
      dirs)  _files -/ ;;
      # 未知 name は無視 (DR-117 §4.2)
    esac
  done

  return 0
}

compdef _{{PROGRAM_NAME}} {{PROGRAM_NAME}}
