# kuu completion glue templates (spec 正本)

DR-117 の行文法・env プロトコルに準拠した shell glue の**言語非依存の正本**。
各言語実装は本ディレクトリを vendoring (転写) し、production バイナリに内蔵する
(DR-117 波及節 + `docs/findings/2026-07-23-completion-ux-layer-plan.md` §2 の
UXL-Q2=a 裁定)。

## 位置づけ

- 正本 = 本 `templates/`。改訂は spec リポで行い、行文法 (DR-117 §4) や翻訳表
  ([TRANSLATION.md](./TRANSLATION.md)) の改訂窓と同一 push 窓で運ぶ
- 各実装は転写 + CI 同期検査で drift を防ぐ (findings §2.2)。MoonBit なら
  spec pin + `scripts/` の転写生成 + diff 検査、Rust なら `include_str!` + vendoring、
  Go なら `go:embed` + vendoring
- テンプレの意味の正しさ (shell 挙動) の裏取りは実装リポの実機検証が担う
  (findings §5)。本ディレクトリは**行文法と翻訳の対応表** としての正本

## テンプレファイル

| ファイル | shell | 完成度 |
|---|---|---|
| `completion.zsh` | zsh | 完成度優先 (M2 の第一目標。findings §4 M2 行) |
| `completion.bash` | bash | 骨格 (bash 5.x 主、3.2 は縮退経路コメント明示) |
| `completion.fish` | fish | 骨格 (native tab-desc 前提) |
| `TRANSLATION.md` | (仕様) | 翻訳表の正本 (実機未検証セルは明示) |

## テンプレ変数

記法は `{{NAME}}` (二重波括弧) — shell の `${...}` / `$(...)` と衝突しない。
実装側の焼き込みで literal 文字列置換する。

### 焼き込み変数 (DR-117 §2.5 の 3 点)

| 変数 | 意味 | 供給元 |
|---|---|---|
| `{{BINARY}}` | 問い合わせ先バイナリの参照 (絶対パス or 素の名前 — テンプレの関心) | `completion_script` capability の生成時、生成側の自身 |
| `{{PROGRAM_NAME}}` | 補完対象コマンド名 (`compdef` / `complete -F` / `complete -c` が要求) | definition ルートの name。呼び出し側で上書き可 (DR-113 §4.4 と同型) |
| `{{UUID}}` | env × argv 二箇所一致トークン (DR-117 §3.1)。生成時 1 回採番 | 呼び出し側が乱数注入 (findings §3.2) |

### 呼び出し形の分岐 (DR-117 §6)

形態 A (セルフバイナリ組み込み、本命) と形態 B (kuu-cli 経由の幻影コマンド) で
query 呼び出し形が違う。テンプレは実装が形態別に選択して焼き込む。

- **形態 A**: env プロトコル経由

  ```sh
  KUU_COMPLETE={{UUID}} KUU_COMPLETE_INDEX="$cword" {{BINARY}} {{UUID}} <shell> <words...>
  ```

- **形態 B**: kuu-cli 正規サブコマンド (env プロトコルは使わない)

  ```sh
  {{BINARY}} completion query {{DEF_JSON}} --shell <shell> --cword "$cword" -- <words...>
  ```

形態 B は追加変数 `{{DEF_JSON}}` (定義ファイル絶対パス) を持つ。焼き込みで
どちらの呼び出し行を選ぶかは実装の関心 — テンプレ本文はどちらかに固定してよい
(骨格版は形態 A に固定)。

## 行文法 (DR-117 §4) — glue はこれを parse する

```
<insert>\t<desc>\t<flag1>\t<flag2>...\n     # 候補行 (説明・フラグは省略可、空フィールド可)
:<directive> <arg>...\n                     # directive 行
                                            # 空行は無視
```

- 候補フラグ v1 語彙: `nospace` のみ (未知フラグは無視 — 前方互換)
- directive v1 語彙: `:shell_action files` / `:shell_action dirs` のみ
  (未知 directive は無視 — 前方互換)
- 挿入文字列に TAB / LF を含む候補は binary 側で除外済み (§4.3)
- 説明中の TAB / LF は空白 1 個へ正規化済み (§4.3)
- 行順が規範的な提示順 (DR-116 §2)。glue は再ソートしない (順序保持翻訳を常時行う)

DR に無い行形式・語彙を発明しない。曖昧なフィールドは無視 (前方互換の型)。

## 転写運用 (vendoring)

1. 各実装リポは spec を SHA pin (kuu-cli の deps/kuu.mbt と同型)
2. `templates/*` を実装リポ内へ転写 (MoonBit なら String 定数化、Rust/Go なら埋め込み)
3. CI で spec pin と転写内容の diff 同期検査
4. lockstep push 窓 (spec templates/ 改訂 → 各実装転写 + pin bump) は
   `docs/journal/` の既存 lockstep 手順に乗せる (findings §2.2)

## 関連

- `docs/decisions/DR-117-completion-generator-abi.md` (§2.5, §3, §4, §6)
- `docs/decisions/DR-116-completion-generator-policy.md` (policy — binary 内 1 箇所)
- `docs/findings/2026-07-23-completion-ux-layer-plan.md` §2, §4 (M2 の位置づけ)
- `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (翻訳表の出所)
