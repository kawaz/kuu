# DR-088: 宣言された値源はデフォルトの存在 — 選好述語は静的宣言、最終判定は解決値

> 由来: 遅延述語 (requires の値充足) を解決後の読者に後段化したところ、repeat の取り分選好 (stop/more) から制約が消えて stop 候補が生成されなくなる regression が出た (kuu.mbt REVIEW-D1)。一方で旧来の探索中判定は committed/default 属性しか見ず、env 供給の目的語を誤って違反判定する bug があった。kawaz 裁定 (2026-07-10): 「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもんでしょう。つまりデフォルトはあるんだから env や config もあればデフォルトがあるってことになるのは当然」「遅延評価でデフォルト解決したらやっぱりありませんでした、になったらそのノードは unset のまま = committed=false に戻されて落ちる」。

## 決定

### 1. 宣言された値源 = デフォルトの存在

env / config (config_key・config 席) / inherit の宣言は、「その値源から遅延解決する default_fn が設定されている」ことと同型である (DR-087 の placeholder モデルの帰結)。したがって**値充足の静的判定において「デフォルトがあるか」は「default 属性 ∨ default_fn ∨ env 宣言 ∨ config 席 ∨ inherit 宣言のいずれかがあるか」**を意味する。default 属性だけを特別視しない。

### 2. 経路探索 (選好・完全性) の充足述語は静的宣言ベース

repeat の取り分選好 (stop/more) や完全経路判定に参加する遅延述語 (requires の値充足) は、探索中は **committed ∨ §1 の宣言があるか** で判定する。値の実解決は探索中に行わない — 判定材料が定義の静的構造だけなので、経路選択は実行時の env/config の中身に依存せず決定的になる。

### 3. 最終判定は遅延解決後の実値 — 空なら unset のまま落ちる

制約の確定判定 (violation の成立) は、値源ラダーの遅延解決 (DR-087) が済んだ最終状態に対して行う。宣言はあったが解決したら値が無かった (env 未設定等) 場合、そのノードは **unset のまま (committed=false、値なし)** であり、これを要求していた述語はそこで落ちる — 探索へ巻き戻して別候補を再探索することは**しない** (§2 で経路は静的宣言に基づき確定済み。実行時の値の不在は、その経路の素直な失敗である)。

### 4. 帰結 (canonical 例)

- `xs (repeat greedy, requires:[y]) + y (宣言なし)`、入力 `a b`: more 読み (xs=[a,b]) は y が committed でも宣言持ちでもないため不完全 → 選好は stop (xs=[a], y=b) に倒れて成功 (従来挙動の保存)
- `a (requires:[c]) + c (env: C)`、`C=x` で `--a`: c は env 宣言によりデフォルト有り → 経路完全 → 最終判定で解決値 x を得て充足 → 成功 (従来の誤 Failure の解消)
- 同上で `C` 未設定: 経路は同じく完全 → 最終判定で c は unset のまま → requires 違反で失敗 (stop 相当の代替が定義上あっても再探索しない)

## 採用しなかった案

### 候補ごとの実解決を選好判定に注入する

DR-047 §2 と §4 の合成として意味論上は最も忠実だが、探索候補ごとに値源解決が走り、経路選択が実行時の env/config の中身に依存する (同じ定義・同じ argv でも環境で構文解釈が変わる)。静的宣言ベースは決定性と実装コストの両面で勝る。

### 選好から制約を外す (常に貪欲側が勝ち、違反は失敗)

「requires を満たすために 1 トークン残す」という取り分表現が書けなくなる (REVIEW-D1 が pin する表現力の喪失)。

## 波及

- kuu.mbt: 探索中の value_present を §2 の静的宣言判定に置換 (committed ∨ default_values ∨ env ∨ config 席 ∨ inherit)。requires の確定判定は解決後の読者 (apply_requires_filter、bool = 解決値 true / 非 bool = 解決値の有無)。issue value-present-ladder-gap が追跡
- fixtures: env/config 供給の requires 目的語の成功・失敗 (宣言あり×実値なし) の対を pin。旧 committed/default 限定の挙動を pin していた fixture (requires-bool-target-contrast.json の該当 case) は本 DR に従い更新
- DR-047 §4 の「充填後の最終状態で評価」は §3 が実装形を与える。§2 の「制約が経路の完全性に参加」は §2 の静的述語として実現

## 関連

- DR-047 (遅延述語・値充足) / DR-087 (遅延解決 — 本 DR は其の探索面への延長) / DR-043 (repeat 選好) / DR-051 §2 (unset と absent)
- kuu.mbt issue value-present-ladder-gap (経緯) / REVIEW-D1 wbtest (取り分選好の pin)
