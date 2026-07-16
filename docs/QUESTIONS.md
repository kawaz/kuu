# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## UX-Q7R: CLI の resolve 適用条件の再考 (Q7 誤読の巻き戻し、2026-07-16)

> 経緯: UX-Q7 への kawaz 回答「Q1-6で出た話も含めて最高」を a 案承認と誤読して DR-109 §7 を確定処理したが、原文は「〜含めて**再考**」の typo だった (kawaz 訂正)。DR-109 §7 に再考中 note を追記済み。§7 の内容は再裁定まで暫定。

元の問い: conformance fixture は `resolve` フラグで resolve 相の適用を選ぶが、kuu-cli は常時 resolve を適用する。この差で export-key/collision :: single-exposure-ok が kuu-cli だけ fail した (未発火 flag の preset default が resolve で充填され共露出キーに混ざる。kuu.mbt runner は green)。

「Q1-6 で出た話も含めて再考」の解釈候補 — Q6 裁定 (kuu-cli はテストツールでなくアプリ内 kuu と同一挙動が本義) を踏まえると:

- **(a) 旧 a 案 (暫定実装中)**: CLI は既定 resolve 維持 + 「preset default は export_key 共露出に参加しない」を spec 明文化。collision fail は射影側で解消
- **(b) resolve 適用有無を fixture と同じ軸で CLI にも露出**: `--no-resolve` opt-out を設け、既定は resolve。conformance gate は fixture の resolve フラグに追従して切替
- **(c) 「アプリ内 kuu と同一挙動」の含意を先に確定する**: アプリ内の kuu (kuu-ux 経由) が parse/resolve をどう呼ぶのが標準形かを kuu-ux 設計 (骨子柱 1 の Binding 面) で先に決め、kuu-cli はそれに従う — Q6 の第一原理からの導出で、resolve の既定を CLI 単独で決めない
- (d) その他 (再考の意図を自由文で)

(kawaz の「再考」の意図がどの層 (CLI 既定 / spec 明文化 / kuu-ux との整合) に向いているか自由文で教えてもらえれば、選択肢を組み直します)

## UX-Q8: config_files (パス動的 lookup) の CLI 注入形 (Q6 の追補、2026-07-16)

kuu-cli の conformance sweep で blocked-skip 7 件。fixture の `config_files` (パス → config オブジェクトのマップ供給、動的 lookup) に対応する CLI 注入形が未設計 — 現 `--config <json|file>` は単一オブジェクト注入のみ。

- **(a) `--config-file <path>=<json|file>` (繰返し可) を追加** (統括推し): fixture の config_files 軸と 1:1。実環境の既定動作 (定義解決パスの実ファイル読み) とも互換で、試験用の固定注入という Q6 の枠に素直に収まる
- (b) `--config` を拡張して `{"<path>": {...}}` のマップ形も受ける (オプション数は増えないが、単一オブジェクトとマップの判別が値の形依存になる)
- (c) 実需が薄ければ conformance 専用の隠し口 (環境変数等) に逃がし、公開 CLI 契約には載せない

## PKG-Q バッチ: kuu-core の engine/builtins/kuu 分離 — 上流裁定 (2026-07-16)

> 背景: kawaz 方針 (2026-07-16)「builtin (installer/型parser/filter) を 3rd と同じ interface・同じ登録経路で実装すべき、package も一線を引く」— 総コスト比較で今やるのが明白と裁定済み。
> 一次資料: kuu.mbt の `docs/findings/2026-07-16-engine-builtin-boundary-survey.md` (争点 21 件の全列挙)。
> 依存構造: PKG-#1 (Node ADT) と PKG-#14 (Entity 分割) の 2 争点が最上流で、ここが決まると 12+ 件が従属決定される。本バッチは上流 + 進め方のみを裁く。

### PKG-Q1: Node ADT の帰属モデル (争点 PKG-#1、全体の根本判断)

現 `enum Node` は 27 variant で、engine 純粋 (Exact/Or/Seq/Ref/Bind/Many/Rooted 等 10 個) と builtin lowering 産物 (NumArg/BoolArg/DeprMark/CmdSat/NativeMatch 等 17 個) が同居している。

- **(a) Node open 化 — engine は構造 variant ~10 個のみ内蔵し、値プリミティブ・マーカー・satellite は builtin が拡張として登録する** (統括推し): 「3rd が builtin と同じ経路で型を足せる」という今回の第一原理の直接実現。eval の case 分岐は拡張点 (trait or 登録 dispatch) 経由になる。工数最大だが、多言語展開時の「engine 移植 + builtin は各言語で plugin 実装」の二層が最も綺麗に立つ
- (b) Node は閉 ADT のまま engine に残し、eval の値 arm の中身 (parser 呼び出し・エラー生成) だけを registry lookup に還元する (中間: variant 追加は engine 改訂が要るが、値の意味論は差し替え可能)
- (c) 現状維持 (Node も eval も engine が全部知る) — package 分離は installer/filter/wire_decode 層だけで行う

### PKG-Q2: Entity struct の分割 (争点 PKG-#14、PKG-Q1 と直交する第 2 の軸)

現 Entity は 30+ フィールドで、値セルの本質 (name/ty/値) と builtin 固有の宣言 (int_round/base_prefix/bool_config/tty_stream/dd_match...) が同居している。

- **(a) engine 最小 Entity (name/ty/セル本質) + builtin 固有宣言は descriptor/config として各 builtin が所有する分離** (統括推し): DR-061 §4「factory config は factory 自身が検証」の実装への直写し
- (b) Entity は肥大のまま engine に置き、builtin フィールドは optional として黙認 (分離を諦める軸)

### PKG-Q3: matcher の TCount→increment 直書き (争点 PKG-#5、最も明白な癒着の扱い)

matcher.mbt が builtin 型 count の update effect 語彙 (`Update("increment", [])`、DR-077 §3) を直書きしている。

- **(a) PKG-Q1/Q2 の裁定に従属させて自然解消** (統括推し): Q1=a なら count は builtin 拡張の Node/効果として登録され、matcher の直書きは構造的に消える。独立の暫定修正はしない (二度手間)
- (b) 上流と独立に先行修正 (effect 語彙を registry 参照化する小改修を先に入れ、分離本体を待たずに癒着を切る)

### PKG-Q4: 進め方 — spec DR と実装の順序

- **(a) spec 側に「kuu-core 標準パッケージング」DR を先に立て (engine/builtins/kuu の 3 層 = 多言語展開の契約、言語非依存の規範)、kuu.mbt は MDR でそれに従う** (統括推し): この分離は kuu.mbt のローカル事情でなく「全言語実装がこう構成されるべき」という spec の主張になるべき。VISION §2 の層構造とも接続
- (b) kuu.mbt の MDR だけで進める (spec 化は 2 言語目が出る時に一般化)

(回答例: 「PKG-Q1=a, Q2=a, Q3=a, Q4=a」。Q1=a は工数最大の選択肢である点は明示しておく — MoonBit の trait/open dispatch の表現力確認が実装第一歩になる。残る争点 17 件は上流裁定後に統括が従属決定し、判断が割れるものだけ追加 Q にする)






