# DR-059: inheritable の prefix 生成 — 定義スコープ名 1 個の固定 prefix、全祖先で同綴り

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-009。DR-013 が確定を先送りした prefix 生成ルール (案A = 直近親のみ / 案B' = 相対パス全部 / 案A+B' = 衝突時のみ長いパス) の決着。本セッションで確定。

## 決定

### 1. prefix は定義スコープの name 1 個で固定 (案 A)

inheritable 要素の祖先スコープでの綴りは `<定義スコープの name>-<自 name>`:

- `socket` 配下の `ttl` → 全祖先スコープで `--socket-ttl` (upstream レベルでも root レベルでも同じ綴り)
- 自スコープでは prefix なし (`--ttl`)
- 祖先の深さで綴りは変わらない — 利用者は 1 つの綴りだけ覚えればよい

### 2. 衝突の扱いと別綴りの逃げ道

- 綴りの衝突は定義時に予防しない。実行時の完全経路一意性 (DR-038) が ambiguous として検出する既定体制 (DR-021) に任せる
- 別の綴りが欲しい場合は alias (DR-057) で明示 opt-in する — canonical は一意規則、変種は明示

auto_env (DR-049) が「フル修飾 canonical + 短名は明示」としたのと役割は対称だが向きが逆: env は平らな名前空間で衝突が致命的なのでフル修飾を canonical に、CLI はスコープ付き名前空間でタイプ量が重要なので短い固定 prefix を canonical に置く。

### 3. lowering は global installer の逆方向コピー

inheritable installer が、**祖先スコープの宣言層へ prefix 付き入口宣言 (ref/link 衛星の宣言的コピー) を追加**する — global installer (親 → 子孫) と同型の宣言的コピーの**逆方向 (子 → 祖先)**。展開は long 等の入口 installer が不動点反復で行う。

- shadowing も global と対称: 祖先スコープが同じトリガ literal を自前で持つ場合はコピーしない (自前優先)
- 値の意味論は DR-013 確定分のまま: 各スコープで書かれた値がその配下のインスタンスのデフォルトになる (inherit 席 DR-031/042 と対)。祖先側の書き込み先セルの lowering 詳細は垂直スライスと共設計

### 4. help の見せ方はレンダラの関心

祖先スコープの help に prefix 付き綴りをどう出すか (折りたたみ / --help-all のみ 等) はレンダラの関心 (DR-058 と同じ分離)。宣言層に inheritable 由来であることが inert に残る (非削除①') ため、レンダラは参照 (DR-056) で判断できる。DR-013 の「help 肥大化」懸念はこの分離で解消する。

## 採用しなかった案

### 案 B' (相対パス全部、--upstream-socket-ttl)

深いネストで綴りが長くなりタイプ量を損なう。衝突予防が動機だったが、実行時 ambiguous 検出 (§2) がある今は存在理由がない。

### 案 A+B' (衝突時のみ長いパス)

定義の別の場所に要素を足すと既存オプションの綴りが変わる**遠隔作用**。暗黙ルール最小化 (§0.1) に反し、help の安定性も損なう (DR-013 での懸念の根源)。

### 祖先の深さごとに prefix を延ばす (upstream レベルは --socket-ttl、root は --upstream-socket-ttl)

同じ実体への綴りがスコープごとに変わり、覚える綴りが増えるだけ。全祖先同綴りの方が単純。

## 関連

- DR-013 (inherit / inheritable — 値の意味論は不変、prefix 未確定の解消。Superseded 注記を更新)
- DR-042 (installer — 宣言的コピーの同型、canonical セット追加)
- DR-057 (alias — 別綴りの opt-in 経路)
- DR-049 (auto_env — 対称の判断、向きが逆の理由)
- DR-038 / DR-021 (衝突の実行時検出)
- DR-056 / DR-058 (help 表示はレンダラ + 参照)
- findings `2026-06-29-ast-missing-pieces.md` F-009 (解消)
