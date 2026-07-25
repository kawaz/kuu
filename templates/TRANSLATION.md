# 応答行文法 → shell 機構 翻訳表 (正本)

DR-117 §4 の行文法要素を各 shell の native 機構へ写す対応。
出典は `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (Web 調査由来)、
実機検証は `kuu-cli/docs/findings/2026-07-23-shell-matrix-verification.md` (findings §5.1 段 1)。

## status 語彙

- `要実機検証` — 出典が Web 調査のみ、テンプレ実装者は挙動を仮定しないこと
- `実機確認済 (<shell> <version>)` — 実機マトリクス検証 (M4 段 1) で観測済み
- `縮退確認済 (<shell> <version>)` — 該当機構が該当環境で使えず、代替経路の挙動を実機で確認
- `未検証 (環境なし)` — 検証環境が用意できず未確認

## 順序保持 (candidate 行順は規範、DR-116 §2)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_describe -V` / `compadd -V <group>` で unsorted group 指定 | 実機確認済 (zsh 5.9.1) | 入力順 `cherry,apple,banana` がその順で表示されることを実機観測 |
| bash 4.4+ | `compopt -o nosort` | 実機確認済 (bash 5.3.9) | 入力順 `cherry,apple,banana` がその順で表示されることを実機観測 |
| bash 3.2 | 縮退 (ソート不可) | 縮退確認済 (bash 3.2.57) | `compopt -o nosort` が unknown option でエラー (glue は `\|\| true` で無視)。結果は alphabetical sort。順序保持を諦める仕様通り |
| fish | 手段なし (fish が常時ソート) | 縮退確認済 (fish 4.8.1) | 入力順 `cherry,apple,banana` が表示上 `apple,banana,cherry` に並び替わることを実機観測 — 諦め仕様通り (DR-117 §4.2 の `:keep_order` 不採用と整合) |

## 説明列

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_describe` (`insert:desc` 形式) | 実機確認済 (zsh 5.9.1) | `insert  -- desc` で表示されることを観測 |
| zsh (nospace group) | `compadd -d <display-array>` | 実機確認済 (zsh 5.9.1) | `-d ns_display` の中身が表示に使われる — display 配列を `"insert  -- desc"` 形で組み立てて渡す必要あり (bug-fix 2026-07-23) |
| bash | 表示は候補のみ (`COMPREPLY` に説明を混ぜられない) | 実機確認済 (bash 5.3.9, 3.2.57) | 説明は落ちる縮退。関数側で `-- desc` 付き display を作っても bash が候補文字列としてそのまま補完に埋め込むため実用にならない (DR-117 リスク節通り) |
| fish | `候補\t説明` native | 実機確認済 (fish 4.8.1) | glue の `printf '%s\t%s\n' $insert $desc` により `apple  (green fruit)` 形式で表示されることを実機観測。応答行の TAB 構造をほぼ素通しできる |

## nospace フラグ (候補行 `nospace` フィールド → 空白挿入抑制)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `compadd -S ''` (per-candidate) | 実機確認済 (zsh 5.9.1) | nospace 候補を別 group にして `-S ''` を立てる。normal group と別 group になる副作用: **normal / nospace 混在時は入力順が group 境界で分断される** (実測: `apple(normal), banana(nospace), cherry(normal)` → 表示 `apple, cherry, banana`)。DR-116 §2 の順序規則を group 内でしか保てない (制約として記録) |
| bash 4.4+ | `compopt -o nospace` (関数単位) | 実機確認済 (bash 5.3.9) | per-candidate 表現不可 — 応答内に nospace 候補が 1 つでもあれば関数全体に立てる縮退 (DR-117 §4.1 通り) |
| bash 3.2 | `compopt -o nospace` (関数単位) | 縮退確認済 (bash 3.2.57) | 4.4+ と同じ。3.2 でも `compopt -o nospace` は使えることを確認 |
| fish | 縮退 (per-candidate 表現手段なし、`--flag=` 経路のみ native 抑制) | 縮退確認済 (fish 4.8.1) | 一般候補は unique match で必ず末尾に空白挿入されることを実機観測 (`apple<TAB>X` → `apple X`)。flag 列を落とす縮退は正当。ただし insert_form:"eq" で `--flag=` 形の候補を返すと fish が `=` 直後の空白を native 抑制するため (`--port=<TAB>X` → `--port=X`)、eq 経路に限り縮退が実効的に機能する |

## `:shell_action files`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files` | 実機確認済 (zsh 5.9.1) | cwd のファイル / ディレクトリが表示されることを実機観測 (quoting・展開込みで shell 成熟機構に委譲、DR-060 §4) |
| bash | `compgen -f -- "$cur"` | 実機確認済 (bash 5.3.9, 3.2.57) | 両 version で候補列挙 (dotfiles 含む) を確認 |
| fish | `__fish_complete_path` | 実機確認済 (fish 4.8.1) | cwd の file / directory 混合列挙 (`LICENSE, README.md, subdir1/, subdir2/`) を実機観測 |

## `:shell_action dirs`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files -/` | 実機確認済 (zsh 5.9.1) | ディレクトリのみ表示を実機観測 |
| bash | `compgen -d -- "$cur"` | 実機確認済 (bash 5.3.9, 3.2.57) | 両 version でディレクトリのみ列挙を確認 |
| fish | `__fish_complete_directories` | 実機確認済 (fish 4.8.1) | dir のみ (`subdir1/, subdir2/`) + `(Directory)` 付き表示を実機観測。関数名は fish 4.8.1 で有効 |

## words / cword 素材 (glue → binary への転送)

| shell | words | cword | status | 備考 |
|---|---|---|---|---|
| zsh | `$words` | `$CURRENT` (1-origin) | 実機確認済 (zsh 5.9.1) | glue で `CURRENT-1` に変換して `KUU_COMPLETE_INDEX` へ。mock binary 経由の end-to-end で query 到達を確認 |
| bash | `COMP_WORDS` (再結合後) | `COMP_CWORD` (再結合後 index) | 実機確認済 (bash 5.3.9, 3.2.57) | `COMP_WORDBREAKS` (default `" \t\n\"'@><=;|&(:"`) で `--flag=value` → `[--flag, =, value]`、`http://x` → `[http, :, //x]` のように割れる。glue は「単一 break char は前の word に連結し、後続の非空白 word も継続連結」する後処理で words を再結合してから binary へ渡す (bash-completion `_get_comp_words_by_ref` と同分担、DR-117 §3.4 末尾規範)。cword も再結合後の index に変換 (元 `COMP_CWORD` 位置の word が落ちる集約先を追跡)。実機検証: mock binary + literal 置換後の glue を source して 5 ケース × 2 bash version = 10 判定を実施、全通過を確認 (2026-07-25) |
| fish | `commandline -oc` + `-ct` | `count(commandline -oc)` | 実機確認済 (fish 4.8.1) | `-oc` (カーソル位置より前の完了済みトークン) + `-ct` (現在編集中トークン) の結合で全量 words を、`-oc` の count で cword を得る。実機で末尾空白 (`myapp foo bar <TAB>` → cword=3) と中間トークン (`myapp foo ba<TAB>` → cword=2) 双方が正しくなることを mock binary 経由で確認。素の `commandline -o` は末尾空白時に empty current-token を含めない (実測、cword=2 の欠陥に繋がる) ため使用しない |

## 未知 directive / 未知フラグ

いずれの shell 実装も**未知は無視**する (DR-117 §4 前方互換規則)。
`:shell_action` の `<name>` を解決できない場合も当該 directive を無視して候補なしへ縮退。

- zsh: `case $action in files) ...; dirs) ...; esac` — 未マッチは無視 ✓
- bash: 同様に case で無視 ✓
- fish: `case ':*'` で無視 ✓ 実機確認 (fish 4.8.1、`:unknown_directive foo\napple` 応答で apple のみ候補化)

## 検証中に判明した glue 修正 (2026-07-23)

- **zsh nospace group の表示 bug**: 修正前は `-d ns_pairs` に `insert:desc` 形式の生ペア配列を渡していたため、候補一覧に `banana:yellow` のような raw ペアが表示されていた。修正で `ns_display` (`"$ins  -- $d"` 形式) を別途組み立てて渡すよう変更 (templates/completion.zsh)
- **zsh `local` 印字問題**: 外側 for 内で `local ins=...` として代入済みだった `ins` に対し、内側で `local ins` (値なし) を再宣言すると zsh が `typeset` 互換で現在の binding (`ins=cherry` 等) を stdout に印字してしまう。初期値付き宣言 (`local p='' d=''; ins=''`) で回避

## 検証中に判明した glue 修正 (2026-07-24 fish)

- **fish cword 算出 bug**: 修正前は `commandline -o` (完了済みトークン列) をそのまま words とし、`cword = count(words) - 1` としていた。末尾空白ケース (`myapp foo bar <TAB>`) では `commandline -o` に empty current-token が含まれず count=3 → cword=2 (最終確定トークン "bar" を指す)、DR-117 §3.4 の期待値 3 (空の新規位置) と齟齬。修正で `commandline -oc` (カーソル前完了済み) + `commandline -ct` (現在編集中) の結合を採用: `words = cut_toks + cur_tok`、`cword = count(cut_toks)`。実機再検証で末尾空白 → cword=3、中間トークン `myapp foo ba<TAB>` → cword=2 の双方が正しくなることを確認 (templates/completion.fish)
- **fish nospace 縮退の記述精度**: 修正前の TRANSLATION.md fish/nospace 備考には「fish は既定で `--flag=` の後ろに空白を入れない挙動がある」とだけ書かれ、一般候補への per-candidate nospace が同じ経路で実現するかのような読み方が可能だった。実機で「一般候補の unique match は必ず末尾空白挿入」「`--flag=` 形候補のみ `=` 直後の空白 native 抑制」を分離観測、両者を明示区別する記述に更新

## 検証中に判明した glue 修正 (2026-07-25 bash 再結合)

- **bash `COMP_WORDBREAKS` 分割の再結合 (H9)**: 修正前は `local -a words=("${COMP_WORDS[@]}")` で素の COMP_WORDS を binary へ渡すだけの骨格で、`--flag=value` や `http://x` が `[--flag, =, value]` / `[http, :, //x]` に割れたまま転送されていた (DR-117 §3.4 末尾 規範違反)。修正で glue 内に inline の再結合ループを追加: `COMP_WORDBREAKS` から空白系を除いた集合を分割 char セットとし、走査中に「単一の分割 char (`=` `:` 等)」を見つけたら直前 word に連結して in_break フラグを立て、直後の非空 word も継続連結する。cword も元 `COMP_CWORD` の指す word が再結合後どの index に落ちるかを追跡して変換。末尾空白の空 word は独立 word として保持し「カーソルの新しい位置」を表現。実機マトリクス: bash 5.3.9 / bash 3.2.57 × 5 ケース (通常空白 / `--flag=value` / `http://x` / 末尾 `=` 空白なし / 末尾空白) を mock binary + literal 置換後 glue の source 経由で end-to-end 検証、10/10 全通過 (2026-07-25)
- **bash L72 跡地 TODO 削除**: 「compopt 可用性判定を機能検出で書き直す」TODO 行を削除。直下が既に `if compopt +o filenames >/dev/null 2>&1; then compopt -o nosort ...` の機能検出実装になっており、TODO は跡地だった (`[[no-historical-noise]]` 適用)

### 既知の限界: COMP_WORDS ベース再結合は空白情報を保持しない (bash)

上記 H9 修正で採用した「COMP_WORDS を後処理で再結合する」方式は、bash-completion 系の定石 (`_get_comp_words_by_ref` 相当) に倣った実装だが、**COMP_WORDS が空白情報を落とす**ことに由来する原理的な粗さを持つ。統括側監査 (2026-07-25) で明記された既知ギャップ:

- **現象**: `COMP_WORDS` は shell 側で COMP_WORDBREAKS 分割済みの token 列で、隣接 token 間に空白があったかどうかを区別できない。すなわち
  - ユーザが `myapp foo:bar` と打った場合 → COMP_WORDS = `[myapp, foo, :, bar]`
  - ユーザが `myapp foo : bar` と**空白付きで**打った場合 → COMP_WORDS = `[myapp, foo, :, bar]` (同一)
  再結合は両方を `foo:bar` に畳むため、後者では DR-117 §3.4 の words 契約 (「shell が見ている行の全量トークン列」) から乖離する
- **影響範囲**: `:` `=` `;` `@` `<` `>` `|` `&` `(` を**単独引数として空白区切りで**渡すような CLI の**補完面**のみ (実行時 parse は shell 経由で正しく分割されるため影響なし)。稀なユースケース (これらの char を positional として単独で受ける設計自体が unusual)。DR-117 §3.4 「words[cword] の prefix 絞り」も、こうした単独引数の途中を編集する場面自体が非典型
- **忠実な解**: `COMP_LINE` (現在行の文字列全量) + `COMP_POINT` (カーソル byte offset) から glue 内で bash tokenizer を自前再現し、空白位置を保った words を組み立てる (bash-completion 系の一部拡張・argcomplete 等が採用)
- **今回採らなかった理由**: (1) 補完は best-effort が業界標準 (影響ある稀ケースで多少粗くても parse は壊れない)、(2) COMP_WORDS ベース再結合は bash-completion 系の定石で 90% 以上のケースをカバー、(3) COMP_LINE 再字句解析は quoting / escape / expansion の bash 仕様を forge することになり実装リスクとメンテコストが跳ね上がる (bash 3.2 / 5.x 差も広がる)。忠実解への昇格は別 issue として起票済み

## 参照

- `docs/decisions/DR-117-completion-generator-abi.md` §4 (行文法), §7 (builtin completer)
- `docs/decisions/DR-116-completion-generator-policy.md` §2 (順序規則)
- `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (原表・自己申告)
- `docs/findings/2026-07-23-completion-ux-layer-plan.md` §5 (実機検証 2 段構え)
- kuu-cli `docs/findings/2026-07-23-shell-matrix-verification.md` (段 1 検証ログの正本)
