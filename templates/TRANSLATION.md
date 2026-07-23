# 応答行文法 → shell 機構 翻訳表 (正本)

DR-117 §4 の行文法要素を各 shell の native 機構へ写す対応。
出典は `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (Web 調査由来)。
**各セルの実機検証は M4 で行う** (findings §5)。本表の `status` 列は現時点の裏取り状態。

## status 語彙

- `要実機検証` — 出典が Web 調査のみ、テンプレ実装者は挙動を仮定しないこと
- `実機確認済` — 実機マトリクス検証 (M4) で観測済み。バージョン併記
- `縮退経路` — 該当機構が該当環境で使えず、代替 (順序諦め等) が正当

## 順序保持 (candidate 行順は規範、DR-116 §2)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `compadd -V <group>` で unsorted group 指定 | 要実機検証 | `-V` で任意 tag、group 内の order は unsorted |
| bash | `compopt -o nosort` (bash 4.4+) | 要実機検証 | bash 3.2 (macOS 同梱) では未サポート = 縮退経路 |
| bash 3.2 | 縮退 (ソート不可) | 縮退経路 | 順序保持を諦める。findings §5.1 で明示検証 |
| fish | 手段なし (fish が常時ソート) | 要実機検証 | 順序保持は fish の制約で成立しない — 諦め (DR-117 §4.2 の `:keep_order` 不採用と整合) |

## 説明列

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_describe` / `compadd -d <array>` | 要実機検証 | tag 表示に説明列 |
| bash | 列フォーマット擬似表示 or 省略 | 要実機検証 | cobra V2 型。端末幅・マルチバイトで崩れやすい (DR-117 リスク節) |
| fish | `候補\t説明` native | 要実機検証 | 応答行の TAB 構造をほぼ素通しできる |

## nospace フラグ (候補行 `nospace` フィールド → 空白挿入抑制)

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `compadd -S ''` | 要実機検証 | 該当候補にのみ suffix 空 |
| bash | `compopt -o nospace` | 要実機検証 | 応答単位でなく完了関数単位で立てる場合が多い — 実装で調整 |
| fish | 既定挙動 / `-f` 系制御 | 要実機検証 | fish は既定で `--flag=` の後ろに空白を入れない挙動がある |

## `:shell_action files`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files` | 要実機検証 | quoting・展開込みで shell 成熟機構に委譲 (DR-060 §4) |
| bash | `compgen -f` or `complete -o default` | 要実機検証 | `default` は関数が候補ゼロ時に fallback |
| fish | `__fish_complete_path` | 要実機検証 | fish 組み込み関数 |

## `:shell_action dirs`

| shell | 機構 | status | 備考 |
|---|---|---|---|
| zsh | `_files -/` | 要実機検証 | ディレクトリのみ |
| bash | `compgen -d` | 要実機検証 | |
| fish | `__fish_complete_directories` | 要実機検証 | 存在名は要確認 |

## words / cword 素材 (glue → binary への転送)

| shell | words | cword | status | 備考 |
|---|---|---|---|---|
| zsh | `$words` | `$CURRENT` (1-origin) | 要実機検証 | zsh は 1-origin。0-origin 変換が必要 (`CURRENT-1`) |
| bash | `COMP_WORDS` | `COMP_CWORD` (0-origin) | 要実機検証 | `COMP_WORDBREAKS` で `--flag=value` 等が割れる → 再結合が要る (DR-117 §3.4 末尾) |
| fish | `commandline -o` | `commandline -C` 系 | 要実機検証 | native は行末補完向け。cursor index の切り出しは要調整 |

## 未知 directive / 未知フラグ

いずれの shell 実装も**未知は無視**する (DR-117 §4 前方互換規則)。
`:shell_action` の `<name>` を解決できない場合も当該 directive を無視して候補なしへ縮退。

## 参照

- `docs/decisions/DR-117-completion-generator-abi.md` §4 (行文法), §7 (builtin completer)
- `docs/decisions/DR-116-completion-generator-policy.md` §2 (順序規則)
- `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (原表・自己申告)
- `docs/findings/2026-07-23-completion-ux-layer-plan.md` §5 (実機検証 2 段構え)
