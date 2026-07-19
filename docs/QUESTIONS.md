# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み (裁定記録は findings 2 本と DR-112 が正本)。TRI-Q バッチも全問裁定済み (Q1=分割案 / Q2=a 開いた失敗契約 / Q4=a OutputView 一本化 / Q8=a+named bundle。記録は kuu.mbt の分類表 findings と issue 群)。HOME-T1 (レジストリ publish) も完了。
>
> **HIP-Q バッチ**: kuu.mbt の help query 実装 (kuu.mbt の `src/kuu/help.mbt` ほか、conformance 全 green) で顕在化した spec 未 pin 論点。実装は各問で「暫定採用形」を選んで green にしてあるので、**裁定は急がない** (採用形を追認するなら fixture 追加のみ、変えるなら実装追随が要る)。全問共通の選択肢表記: **a = 実装の暫定採用形を spec 規範として fixture で pin** / **b = 別の形を規範化 (実装追随)** / **c = v1 では未規定のまま保留**。

## HIP-Q1: 自前宣言 vs global コピーの entries 相対順

scope が global 要素のコピーを受けた時、help model の `entries` 内で自前宣言と global コピーをどう並べるか。fixture `fixtures/help/subcommand-path.json` の why が「順序判断が要らない構成にした」と明言している既知の穴。

- **a (実装採用形)**: 自前宣言が先、global コピーは末尾に追加 (installer fixpoint の既存挙動そのまま)。推し — installer の宣言層寄与の自然な帰結で、追加機構が要らない
- b: 別規範 (例: 宣言位置 interleave)
- c: 保留

## HIP-Q2: `depth` は何を制御する指定か (「all」の意味を含む)

### 背景説明

DR-112 §2 の help query シグネチャに `depth?: "scope" | "all"` (省略時デフォルト = 1 層 / "scope") がある。「1 層」= 現在の scope で見える options / commands の**要素だけ**を返す。scope 下のサブコマンドの中身までは再帰的に開示しない。

「`depth: "all"` の意味」の候補:

- **候補 P (再帰開示)**: scope 下のサブコマンドを再帰的に降りて、各サブコマンドの options / commands まで全部 model に含める。生成物は入れ子構造 (各 command entry に "scope" フィールドが付いて、その中に更に options / commands の列が入る)。実 CLI での「help --all」的な用途を想定した機能
- **候補 Q (1 層と同義 / 語彙不要)**: `depth: "all"` に固有の意味を与えない。scope 指定と同じ 1 層 model を返す = そもそも depth 語彙自体が不要。fixture も追加しない
- **候補 R (別の意味)**: scope 下でなく scope 上 (親スコープの global 継承分も含めて全部見せる) 等の別意味論を与える

### 現状

fixture が 1 本も無く、kuu.mbt 実装は暫定で「候補 Q 相当の 1 層 fallback」で動いている (DAll と DScope で同じ model を返す)。

### 選択肢

- **候補 P (推し) — 再帰開示として規定 + fixture 追加**: 深い階層 CLI (kubectl / docker compose / gcloud 等の 2 段以上) で「全体像を 1 回で見たい」需要は実 CLI で観測できる (order-survey-a/b の調査から)。ただし再帰形の fixture 設計は中コスト (階層構造 + command_path の起点をどうするか等の設計判断が要る)
- 候補 Q: 「depth 語彙を v1 で捨てる」— シグネチャから depth 引数ごと落とす。将来 P が必要になったら追加互換で入れる (v1 完備主義 [[feedback-v1-completeness-principle]] とは逆行)
- 候補 R: 別意味 (親スコープ側の全開示) を与える — 実 CLI に対応する慣習なし

### 参照

- DR-112 §2 (help query シグネチャ)
- kuu.mbt の `src/kuu/help.mbt` (DAll = DScope で 1 層返す暫定実装)
- 2026-07-19 実 CLI 調査 (order-survey-a/b の findings で階層 CLI の全体開示ニーズを裏取り予定)

## HIP-Q3: 同名グループの重複宣言を許すか

### 背景説明

DR-112 §5-3 のグループ宣言エントリ (`{"help_group_name": "net", "help_group_title": "Network options", ...}`) は options 列に置く。同じ scope の options 列に **同名 (help_group_name が同じ) のグループ宣言エントリを 2 個以上書けるか?** が本 Q の論点。

**問題の由来**: 原裁定 (2026-07-18 findings) は「(5) 同じグループ名に対する**別設定**の重複宣言は definition-error」だけを書いた。DR-112 §5-6-6 に落とす段階で「別設定の重複は error、**同一設定の再宣言は冪等で合法**」と拡張された (「別設定以外 = 同一設定 = OK」と読み拡張)。fixture `fixtures/help/def-error-group-duplicate.json` の why 節が「同一設定の再宣言は冪等で合法だが、冪等時の model 射影は DR-112 未規定のため本初期セットでは pin しない」と自己申告している = **fixture 起草者自身が未確定領域と明示**。

kawaz 直感 (2026-07-19 発題):「同名グループはスコープに 1 つでは?」= 原裁定の意図と整合し、そもそも「同一設定なら冪等」の後段拡張自体が不要な追加だった可能性が高い。

### 選択肢

- **候補 a (推し) — 無条件重複禁止**: 同名グループの重複宣言は**別設定でも同一設定でも definition-error** (kind: `invalid-range`)。DR-112 §5-6-6 後半の「同一設定は冪等」を削除し、fixture def-error-group-duplicate も「同一設定重複」のケースを追加。kuu.mbt 実装は現「食い違う設定のみ error」を「無条件 error」に強化 (フォローアップ実装)。射影方式 (旧 Q3) の議論自体が消える (重複しないので dedup / 保持の選択が発生しない)
- 候補 b: 現 DR-112 のまま (別設定 = error / 同一設定 = 冪等合法) + 冪等時の model 射影を pin (旧 Q3 の内容)。「同一設定でも重複を書ける必要がある」実 kuu ユースケースの提示が要る
- 候補 c: 保留

### 参照

- DR-112 §5 (6 項) (現行 spec が「同一設定は冪等」を書いている箇所 — 削除候補)
- docs/findings/2026-07-17-help-mechanism-design-plan.md の HELP-Q3 裁定原文 (「別設定なら error」しか書いていない、原意図の物証)
- fixtures/help/def-error-group-duplicate.json (「本初期セットでは pin しない」の自己申告)

## HIP-Q4: グループ宣言エントリへの hidden

グループ宣言エントリ (`{"group": ...}`) に `hidden` を書けるか。現実装は installer vocab 外のため decode reject (Malformed) に倒れている = 「書けない」が事実上の挙動。

- **a (実装採用形)**: 書けない (reject) を仕様として fixture で pin。推し — hidden の面別分割 (ref&link) 裁定と整合し、グループの隠蔽はメンバー全 hidden で表現できる
- b: 座席を与える (グループごと隠す semantics を規定)
- c: 保留

## HIP-Q5: 名前付き alias entry の宣言位置規範

名前付き alias (`{"alias": ...}`) が options 列の中間に宣言された場合、help model 内の実効位置をどうするか。現実装は wire decode が alias を別配列に分離するため**宣言位置が失われ**、help_after 無しの名前付き alias は列末尾相当に落ちる (kuu.mbt の `src/kuu/help.mbt:362-379`)。spec が「options 列内の宣言位置」を規範にするなら decode 形の変更が要る (中コスト)。

- a (実装採用形): 位置無規範 (末尾落ち許容)。alias に位置が要るなら help_after で明示させる
- **b: options 列内の宣言位置を規範化**。推し — 他 entry は全て宣言位置が効くのに alias だけ例外になるのは「読み意味論から導出」の一貫性を欠く。ただし実装コストは a が最小
- c: 保留

## HIP-Q6: spellings 内の main/variant の並び順

`long: ["no:set:false", ":set"]` のように variant spelling を main より先に宣言した場合、model の `spellings` 配列の順。現実装は main 全部 → variant 全部の順で、宣言順と乖離し得る (fixture `fixtures/help/variant-spellings.json` は main 先頭なので非発現)。

- a (実装採用形): main 先 variant 後の正規化順
- **b: 宣言順を保存**。推し — fixture why が既に「宣言順」と書いており、規範の言葉と実装を一致させるべき
- c: 保留

## HIP-Q7: command entry の aliases 併記・hidden/deprecated の fixture 化

DR-112 §3 の model 形には command entry の `aliases` / `hidden` / `deprecated` があるが fixture が無く、現実装は固定値 (`aliases: [], hidden: false, deprecated: false`) のハードコードで green になっている (kuu.mbt の `src/kuu/help.mbt:445-452`)。既知の実装ギャップ。

- **a: fixture を追加して実装ギャップを露見させ、実装を直す**。推し — DR-112 §3 に形は確定済みなので裁定というより作業指示。b/c を選ぶ理由が思い当たらない
- c: 保留 (v1 で command alias/hidden を help に出さない)

