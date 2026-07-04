# DR-049: env lookup の契約 — env_provider のインターフェースと auto_env の名前導出

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-030 (auto_env の名前変換規則) / F-031 (env_provider のインターフェース契約)。本セッションで確定 (深い分岐が無いことを確認の上、設計案をそのまま採用)。

## 決定

### 1. env_provider のインターフェース (F-031)

- registry 区分 `env_provider` は**単一スロット** (types 等の名前空間 map ではなく 1 実装の差し替え)。シグネチャ:

  ```
  env_provider: (key: string) → string | null
  ```

- **null = 未設定**。空文字列は「設定されている」(値あり) として扱う (POSIX の空 env var と整合)
- provider が受け取る key は **prefix 連結済みの最終名** (例: `MYAPP_PORT`)。prefix・スコープの知識は env installer (lowering) 側に閉じ、provider は素朴な getenv でよい
- env installer (DR-042 不変則④) は env 席に lookup を宣言し、lookup は provider の返値を `(value, source: "env")` に包んで ParserContext の source タグ (DR-016 / DR-031) を保存する
- 複数 provider の合成 (override チェーン) は持たない。合成が要る場合は合成済み provider を 1 つ登録する (registry 差し替えの既存流儀)
- 階層帰属はコア (言語実装に必須の最小セット、DR-010)。デフォルト実装は各言語の環境変数 API

### 2. env 値は CLI 入力と同じ手順を通る

env から来た値は string であり、要素の pieceProcessor (pre_filters → parse → post_filters、DR-034) を通る。multiple 要素なら separator 分割も効く (発火 1 回の 1 引数と同じ扱い)。variant の args が「全て string で CLI 引数パースと同じ手順を通る」(DR-011) のと同じ流儀であり、env だけの特別な型経路を作らない。

### 3. auto_env の名前導出 (F-030)

`config.auto_env: true` (DR-014 の階層継承 config) のとき、`env:` を明示しない値セル持ち要素に env 席を自動宣言する。導出規則:

```
env 名 = UPPER(env_prefix) "_" UPPER(scope_path を "_" 連結) "_" UPPER(name)
```

- 例: `env_prefix: "MYAPP"` 配下の `serve` スコープの `port` → `MYAPP_SERVE_PORT`
- name は wire format の snake_case (DR-022) なので変換は uppercase のみ。kebab / camel からの変換規則は定義しない (case 変換は DX 層の pluggable、DR-022)
- **スコープパスはフル修飾**。衝突回避を優先し、短い名前が欲しい要素には明示 `env:` を書く
- env_prefix 未設定なら prefix 部を省く (`SERVE_PORT`)。連結セパレータは `_` 固定

### 4. 明示 env: が auto_env に優先する

- `env:` を明示した要素に auto_env は効かない
- 明示 `env:` の値にも env_prefix は連結される (`env: "PORT"` → `MYAPP_PORT`、DESIGN §12 の既存挙動)。prefix を付けたくない完全指定 (例: `HOME` を読む) は、その要素の `config` で `env_prefix: ""` を上書きする (DR-014 の階層継承で要素単位の上書きが可能) — 専用の記法は増やさない

## 採用しなかった案

### env_provider を名前空間 map にする

引く名前は要素側の `env:` / auto_env 導出が決めるため、provider 側に名前空間は不要。単一スロットで足りる。

### 空文字列を「未設定」扱いにする

POSIX では空の環境変数は存在する状態。値の有効性判定は provider の関心ではなく filter (pieceProcessor) の関心 (non_empty を書けばよい)。

### provider に素の name を渡し provider 側で prefix 解決する

prefix / スコープの知識が provider に漏れ、差し替え時に全実装が同じ導出を再実装することになる。導出は lowering に閉じる。

### auto_env の短名導出 (スコープ省略、MYAPP_PORT)

深いスコープで衝突する。フル修飾を canonical にし、短名は明示 `env:` で opt-in。

## 射程外

- config ファイル値源 (config_provider / `type: "config_file"` / オブジェクトパス対応) は本 DR では扱わない。F-029 として DR-050 で確定済 (そちらを参照)。
- 機微情報のマスキング (F-033) は本 DR で扱わない

## 関連

- DR-050 (config ファイル値源 — F-029 の確定、本 DR 射程外だった部分の後続)
- DR-042 (env installer — 不変則④の席宣言、config をパラメータにする流儀)
- DR-031 (値源ラダー — env 席の位置、source タグ)
- DR-034 (pieceProcessor — env 値の通過経路)
- DR-014 (config の階層継承 — auto_env / env_prefix の供給源、要素単位上書き)
- DR-022 (snake_case wire format — 導出が uppercase のみで済む根拠)
- DR-011 (variant args は string で CLI と同じ手順 — 同族の流儀)
- DR-010 (registry 階層 — env_provider はコア帰属)
- findings `2026-06-29-ast-missing-pieces.md` F-030 / F-031 (解消)、F-029 (DR-050 で確定)、F-033 (射程外)
