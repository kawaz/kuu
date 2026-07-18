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

## HIP-Q2: depth:"all" の再帰形

現実装は fixture 未固定のため `depth:"all"` が 1 層 (`scope` 指定と同じ) の model を返す最小実装。再帰 `scope` フィールドと、再帰時の各階層 `command_path` の起点 (root 起点の絶対 path か) が未規定。

- a: 現状の 1 層 fallback を v1 仕様にする (all = scope の alias)
- **b: 再帰形を規定して fixture 化 (command_path は root 起点絶対 path)**。推し — DR-112 §2 が depth を設けた意図は再帰取得のはずで、alias 化なら depth 語彙自体が不要になってしまう
- c: 保留 (実装は 1 層のまま、DAll 消費者への注意書きだけ)

## HIP-Q3: 冪等グループ再宣言の model 射影

同一設定のグループ再宣言は DR-112 §5-6 で「冪等で合法」(食い違う再宣言のみ definition-error、これは実装・fixture とも green)。ただし合法な冪等再宣言が model にどう出るかが未 pin。現実装は dedup せず宣言数だけグループ宣言 entry を保持する。

- a (実装採用形): 宣言数だけ保持
- **b: 1 個に畳む (初出位置)**。推し — 「冪等」の意味論からは 2 個目以降は観測不能であるべきで、renderer に dedup 責務を漏らさない
- c: 保留

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

