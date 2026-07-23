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

  # words / cword 素材 (TRANSLATION.md words/cword)
  # commandline -o は現在の token 列 (先頭 = コマンド名 = DR-117 §3.4 の全量形)。
  # cursor index は commandline -C からトークン位置へ写す必要がある。
  # TODO(M4): commandline -C からのトークン index 算出を実機検証。骨格は行末補完に倒す。
  set -l words (commandline -o)
  set -l cword (math (count $words) - 1)          # 行末補完 (骨格): カーソル = 最終トークン
                                                  # KUU_COMPLETE_INDEX 省略時と等価 (DR-117 §3.3)

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
    # nospace は fish の既定挙動 (`--flag=` 後ろに空白を入れない) で近似される
    # ため per-candidate 制御は行わない (TRANSLATION.md nospace / fish 行)。

    if test -n "$desc"
      printf '%s\t%s\n' $insert $desc
    else
      printf '%s\n' $insert
    end
  end
end

# fish は候補提供関数を complete -c で登録し、-f で file 補完を抑制。
complete -c {{PROGRAM_NAME}} -f -a "(__{{PROGRAM_NAME}}_complete)"
