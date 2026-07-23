# 応答行文法 → shell 機構 翻訳表 (正本)

DR-117 §4 の行文法要素を各 shell の native 機構へ写す対応。
出典は `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (Web 調査由来)、
実機検証は `kuu-cli/docs/findings/2026-07-23-shell-matrix-verification.md` (findings §5.1 段 1)。

## status 語彙

- `要実機検証` — 出典が Web 調査のみ、テンプレ実装者は挙動を仮定しないこと
- `実機確認済 (<shell> <version>)` — 実機マトリクス検証 (M4 段 1) で観測済み
- `縮退確認済 (<shell> <version>)` — 該当機構が該当環境で使えず、代替経路の挙動を実機で確認
- `未検証 (環境なし)` — 検証環境が用意できず未確認 (fish は当該環境未 install)

## 順序保持 (candidate 行順は規範、DR-116 §2)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_describe -V` / `compadd -V <group>` で unsorted group 指定 | 実機確認済 (zsh 5.9.1) | 入力順 `cherry,apple,banana` がその順で表示されることを実機観測 |
| bash 4.4+ | `compopt -o nosort` | 実機確認済 (bash 5.3.9) | 入力順 `cherry,apple,banana` がその順で表示されることを実機観測 |
| bash 3.2 | 縮退 (ソート不可) | 縮退確認済 (bash 3.2.57) | `compopt -o nosort` が unknown option でエラー (glue は `\|\| true` で無視)。結果は alphabetical sort。順序保持を諦める仕様通り |
| fish | 手段なし (fish が常時ソート) | 未検証 (環境なし) | 順序保持は fish の制約で成立しない — 諦め (DR-117 §4.2 の `:keep_order` 不採用と整合) |

## 説明列

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_describe` (`insert:desc` 形式) | 実機確認済 (zsh 5.9.1) | `insert  -- desc` で表示されることを観測 |
| zsh (nospace group) | `compadd -d <display-array>` | 実機確認済 (zsh 5.9.1) | `-d ns_display` の中身が表示に使われる — display 配列を `"insert  -- desc"` 形で組み立てて渡す必要あり (bug-fix 2026-07-23) |
| bash | 表示は候補のみ (`COMPREPLY` に説明を混ぜられない) | 実機確認済 (bash 5.3.9, 3.2.57) | 説明は落ちる縮退。関数側で `-- desc` 付き display を作っても bash が候補文字列としてそのまま補完に埋め込むため実用にならない (DR-117 リスク節通り) |
| fish | `候補\t説明` native | 未検証 (環境なし) | 応答行の TAB 構造をほぼ素通しできる想定 |

## nospace フラグ (候補行 `nospace` フィールド → 空白挿入抑制)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `compadd -S ''` (per-candidate) | 実機確認済 (zsh 5.9.1) | nospace 候補を別 group にして `-S ''` を立てる。normal group と別 group になる副作用: **normal / nospace 混在時は入力順が group 境界で分断される** (実測: `apple(normal), banana(nospace), cherry(normal)` → 表示 `apple, cherry, banana`)。DR-116 §2 の順序規則を group 内でしか保てない (制約として記録) |
| bash 4.4+ | `compopt -o nospace` (関数単位) | 実機確認済 (bash 5.3.9) | per-candidate 表現不可 — 応答内に nospace 候補が 1 つでもあれば関数全体に立てる縮退 (DR-117 §4.1 通り) |
| bash 3.2 | `compopt -o nospace` (関数単位) | 縮退確認済 (bash 3.2.57) | 4.4+ と同じ。3.2 でも `compopt -o nospace` は使えることを確認 |
| fish | 既定挙動 / `-f` 系制御 | 未検証 (環境なし) | fish は既定で `--flag=` の後ろに空白を入れない挙動がある |

## `:shell_action files`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files` | 実機確認済 (zsh 5.9.1) | cwd のファイル / ディレクトリが表示されることを実機観測 (quoting・展開込みで shell 成熟機構に委譲、DR-060 §4) |
| bash | `compgen -f -- "$cur"` | 実機確認済 (bash 5.3.9, 3.2.57) | 両 version で候補列挙 (dotfiles 含む) を確認 |
| fish | `__fish_complete_path` | 未検証 (環境なし) | fish 組み込み関数 |

## `:shell_action dirs`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files -/` | 実機確認済 (zsh 5.9.1) | ディレクトリのみ表示を実機観測 |
| bash | `compgen -d -- "$cur"` | 実機確認済 (bash 5.3.9, 3.2.57) | 両 version でディレクトリのみ列挙を確認 |
| fish | `__fish_complete_directories` | 未検証 (環境なし) | 存在名は要確認 |

## words / cword 素材 (glue → binary への転送)

| shell | words | cword | status | 備考 |
|---|---|---|---|---|
| zsh | `$words` | `$CURRENT` (1-origin) | 実機確認済 (zsh 5.9.1) | glue で `CURRENT-1` に変換して `KUU_COMPLETE_INDEX` へ。mock binary 経由の end-to-end で query 到達を確認 |
| bash | `COMP_WORDS` | `COMP_CWORD` (0-origin) | 実機確認済 (bash 5.3.9, 3.2.57) | 単純ケースでは `--flag=value` 分割問題は未発生 (mock で `myapp --` パターン検証)。`COMP_WORDBREAKS` による分割の再結合ロジックは未実装 = TODO (DR-117 §3.4 末尾)。glue 骨格は素の `COMP_WORDS` を渡す状態 |
| fish | `commandline -o` | `commandline -C` 系 | 未検証 (環境なし) | native は行末補完向け。cursor index の切り出しは要調整 |

## 未知 directive / 未知フラグ

いずれの shell 実装も**未知は無視**する (DR-117 §4 前方互換規則)。
`:shell_action` の `<name>` を解決できない場合も当該 directive を無視して候補なしへ縮退。

- zsh: `case $action in files) ...; dirs) ...; esac` — 未マッチは無視 ✓
- bash: 同様に case で無視 ✓
- fish: `case ':*'` で無視 ✓ (script 上は確認、実機は未検証)

## 検証中に判明した glue 修正 (2026-07-23)

- **zsh nospace group の表示 bug**: 修正前は `-d ns_pairs` に `insert:desc` 形式の生ペア配列を渡していたため、候補一覧に `banana:yellow` のような raw ペアが表示されていた。修正で `ns_display` (`"$ins  -- $d"` 形式) を別途組み立てて渡すよう変更 (templates/completion.zsh)
- **zsh `local` 印字問題**: 外側 for 内で `local ins=...` として代入済みだった `ins` に対し、内側で `local ins` (値なし) を再宣言すると zsh が `typeset` 互換で現在の binding (`ins=cherry` 等) を stdout に印字してしまう。初期値付き宣言 (`local p='' d=''; ins=''`) で回避

## 参照

- `docs/decisions/DR-117-completion-generator-abi.md` §4 (行文法), §7 (builtin completer)
- `docs/decisions/DR-116-completion-generator-policy.md` §2 (順序規則)
- `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (原表・自己申告)
- `docs/findings/2026-07-23-completion-ux-layer-plan.md` §5 (実機検証 2 段構え)
- kuu-cli `docs/findings/2026-07-23-shell-matrix-verification.md` (段 1 検証ログの正本)
