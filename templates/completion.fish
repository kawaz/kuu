# kuu completion glue (fish) — DR-117 §4 行文法 + env プロトコル (§3)
#
# テンプレ変数 ({{...}}) は spec templates/README.md を参照。
# 実装リポは vendoring 時に literal 置換する。
#
# 対象 shell: fish
# 完成度: 骨格 (実機検証は M4。TRANSLATION.md status 参照)
#
# 順序保持: fish は常時ソートするため、順序保持は成立しない (TRANSLATION.md)。
#          DR-117 §4.2 の `:keep_order` directive 不採用と整合。

function __{{PROGRAM_NAME}}_complete
  set -l uuid {{UUID}}
  set -l binary {{BINARY}}

  # words / cword 素材 (TRANSLATION.md words/cword, DR-117 §3.4)
  # commandline -oc は「カーソル位置より前の完了済みトークン列」、
  # commandline -ct は「カーソル位置の現在編集中トークン (末尾空白時は空文字)」。
  # words = cut_toks + cur_tok、cword = count(cut_toks) で末尾空白 / 中間トークン
  # 双方が正しくなる (実機検証 fish 4.8.1)。
  set -l cut_toks (commandline -oc)
  set -l cur_tok (commandline -ct)
  set -l words $cut_toks $cur_tok
  set -l cword (count $cut_toks)

  # 形態 A: env プロトコル (DR-117 §3.1)
  set -l response (
    env KUU_COMPLETE=$uuid KUU_COMPLETE_INDEX=$cword \
      $binary $uuid fish $words 2>/dev/null
  )
  or return 1

  # 応答 parse (DR-117 §4)
  # fish は候補行 `insert\tdesc` を native に扱える (TRANSLATION.md 説明列)。
  # ただし応答は insert\tdesc\tflag... の 3 カラム以上ある可能性があるため
  # 明示的に切り出す (flag 部分は fish native 補完には運べないため落とす — 縮退)。
  for line in $response
    # 空行は無視 (§4.4)
    test -z "$line"
    and continue

    # directive 行
    switch $line
      case ':shell_action files'
        __fish_complete_path
        continue
      case ':shell_action dirs'
        __fish_complete_directories
        continue
      case ':*'
        # 未知 directive は無視 (DR-117 §4 前方互換)
        continue
    end

    # 候補行: TAB 区切りで insert / desc / flags を分離
    set -l parts (string split \t -- $line)
    set -l insert $parts[1]
    set -l desc ""
    if test (count $parts) -ge 2
      set desc $parts[2]
    end
    # flags は現状 fish native 補完で表現手段が無いため落とす (縮退)。
    # nospace: 一般候補への per-candidate nospace は fish 4.8.1 実測で表現手段
    # 無し (unique match は必ず末尾に空白挿入)。ただし insert_form:"eq" (§2.6)
    # で `--flag=` 形の候補を返した場合は fish が `=` 直後の空白を native に
    # 抑制するため、eq 経路に限り縮退が実効的に働く (TRANSLATION.md nospace / fish 行)。

    if test -n "$desc"
      printf '%s\t%s\n' $insert $desc
    else
      printf '%s\n' $insert
    end
  end
end

# fish は候補提供関数を complete -c で登録し、-f で file 補完を抑制。
complete -c {{PROGRAM_NAME}} -f -a "(__{{PROGRAM_NAME}}_complete)"
