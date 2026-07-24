# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺DOG-Q4α: help_on_empty — 命名と発火条件の意味論

「引数なし = help 表示 + exit 0」の宣言席 (findings `2026-07-24-dogfooding-d1-expressiveness.md` F5、kawaz 示唆: help_on_failure と対称の糖衣)。

**命名** (素材 5-1):
- (a) `help_on_empty` — help_on_failure との対称が最強、省略形なし
- (b) `help_on_no_input` / `help_on_bare_invocation` — 冗長 or 日本人に遠い

**「引数ゼロ」の発火条件** (素材 5-3、本丸):
- (A) 完全経路 0 消費で成立した時 — `cli --verbose` は消費ありなので発火**しない**
- (B) positional/subcommand 席が 0 消費で成立した時 — global option だけの `cli --verbose` も「やる仕事の指定が無い」ので発火**する**
- (C) on_failure (DR-048) の判定機構に「起点 dead end」として乗せる — ただし引数ゼロは**成功** (完全経路成立) なので DR-048 の「完全経路 0 本」前提と矛盾し、意味論的に無理筋

- **統括推し: (a) + (B)** — 直観 (「引数なしで help を見たい」= 仕事の指定が無い状態) は B。ただし B は「positional/subcommand 席」の判定を lowered 5 面 (DR-063 §3) のどの面で数えるかの明文化が 1 段必要 (裁定後の設計作業として引き受ける)

## 👺DOG-Q4β: help_on_empty — 所有・機構・スコープ・既定値

**所有 + 発火機構** (素材 5-2/5-6、連動するので 1 択に統合):
- (a) help_installer が所有し、on_failure とは**別機構** (on_empty_expansion) で展開 — 「引数ゼロは成功であって failure ではない」ため。empty 発火時は success 経路のまま #help を立て、アプリは exit 0 に自然に倒れる
- (b) 汎用 on_empty 属性を先に語彙化し help_on_empty はその糖衣 (on_failure/help_on_failure の 2 層と同型) — 対称性は美しいが、汎用側の user が現状居ない
- **統括推し: (a)** — DR-113 §7.2 の 2 層構成 (汎用 on_failure + 糖衣) の対称は「failure が汎用概念だから」成立している。empty は help 以外の用途が見えておらず、糖衣 1 層で足りる。必要が出たら 2 層化は後から互換に切り出せる

**スコープ全体への一括指定** (素材 5-4):
- (a) scope `config` キーとして昇格 (例: `config: {"help_on_empty": true}`) — DR-014/096 の継承機構 (node の config フィールド、chain 継承・子で上書き) に乗る。cli-design-preferences の「トップ・子・孫の全レベルで共通」要件への最短経路
- (b) node 属性のみ、config 昇格しない
- **統括推し: 条件付き (a)** — ただし **DR-014 との緊張あり**: DR-014 は「help / version は config に含めない (どんな引数で起動するかは type の関心)」を kawaz 裁定で明記している。当時の対象は help の**入口** (起動綴り) であり、help_on_empty は入口でなく**発火 policy のダイヤル** (long_eq_sep 等の表面ダイヤルと同族) なので DR-014 の射程外と読める — が、この読み替えで進めてよいかも本 Q の裁定対象。読み替え NG なら (b) に落ちる。注記: findings 素材の「installer の config パラメータ」表記は不正確で、DR-014/096 の継承機構は **node の config フィールド** が正

**既定値** (素材 5-5):
- (a) 既定 true (help_on_failure と同じ)
- (b) 既定 false — 明示宣言を要求
- **統括推し: (b)** — help_on_failure の既定 true は「失敗時にヒント」という保守的選択だから許される。empty 既定 true は daemon 型 / REPL 型 CLI (`myd` 単独起動 = 主機能) を事故らせる。「書きたい時にちゃんと書ける」が要件であり「暗黙に効く」ことではない
