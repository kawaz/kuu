# kuu completion glue (bash) — DR-117 §4 行文法 + env プロトコル (§3)
#
# テンプレ変数 ({{...}}) は spec templates/README.md を参照。
# 実装リポは vendoring 時に literal 置換する。
#
# 対象 shell: bash 4.4+ (fully-featured) / bash 3.2 (macOS 同梱、縮退経路)
# 完成度: 実機確認済 (bash 5.3.9 / 3.2.57 — TRANSLATION.md status 参照)

_{{PROGRAM_NAME}}() {
  local uuid={{UUID}}
  local binary={{BINARY}}

  # words / cword 素材 (TRANSLATION.md words/cword)
  # COMP_WORDS は COMP_WORDBREAKS (default `" \t\n\"'@><=;|&(:"`) の各 char で
  # 分割される: `--flag=value` → [--flag, =, value] / `http://x` → [http, :, //x]。
  # DR-117 §3.4 末尾の words 契約は「shell が見ている行の全量トークン列」なので、
  # 割れた breakchar と隣接トークンを glue 側で再結合してから binary へ渡す
  # (bash-completion `_get_comp_words_by_ref` と同分担、clap / argcomplete と同型)。
  local -a words=()
  local cword=0
  {
    local __i __n=${#COMP_WORDS[@]} __j=-1 __in_break=0
    local __ccur=$COMP_CWORD
    # COMP_WORDBREAKS から空白系 (space/tab/newline) を除いた集合が実際の分割 char。
    local __excl="${COMP_WORDBREAKS//[[:space:]]/}"
    local __w
    for (( __i=0; __i<__n; __i++ )); do
      __w="${COMP_WORDS[$__i]}"
      if [[ ${#__w} -eq 0 ]]; then
        # 末尾空白由来の空 word: 新規 word として独立 (カーソルの「新しい位置」)
        words+=("$__w"); __j=$((__j+1))
        (( __i <= __ccur )) && cword=$__j
        __in_break=0
      elif [[ ${#__w} -eq 1 && "$__excl" == *"$__w"* ]]; then
        # 単一 break char: 直前 word に連結、以降 in_break=1 で次 word も継続連結
        if (( __j < 0 )); then
          words+=("$__w"); __j=0
        else
          words[$__j]="${words[$__j]}$__w"
        fi
        (( __i <= __ccur )) && cword=$__j
        __in_break=1
      else
        # 通常 word: in_break=1 なら直前と連結、そうでなければ独立
        if (( __in_break )); then
          if (( __j < 0 )); then
            words+=("$__w"); __j=0
          else
            words[$__j]="${words[$__j]}$__w"
          fi
          (( __i <= __ccur )) && cword=$__j
        else
          words+=("$__w"); __j=$((__j+1))
          (( __i <= __ccur )) && cword=$__j
        fi
        __in_break=0
      fi
    done
  }

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
  # 可用性判定は bash version 直接判定でなく `compopt +o filenames` の成否で行う
  # (機能検出、DR-117 §3.4 shell 差分の吸収と同思想)。
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
