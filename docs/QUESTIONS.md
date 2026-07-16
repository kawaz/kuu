# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## UX-Q バッチ: kuu-ux 設計骨子の承認と初期裁定 (2026-07-16)

> 土台: `docs/findings/2026-07-16-kuu-ux-design-skeleton.md` (設計骨子 7 本柱)。
> 一次調査: 同日付の `-internal-survey` / `-ecosystem-survey`。
> 実測: kuu-cli conformance sweep = parse 547 case 中 245 pass / 302 fail (4 系統)。

### UX-Q1: 設計骨子 (7 本柱) の承認

- **(a) 承認 — 骨子を DR 化して各論へ進む** (統括推し): 柱 1 (ux = UsefulAST 実体化の 3 責務) / 柱 2 (書き味合流モデル) / 柱 3 ($required = named capability marker + export validation) / 柱 4 (help/error は semantic model まで共通) / 柱 5 (CLI envelope は fixture protocol 正本) / 柱 6 (completion は runtime 問い合わせ第一候補) / 柱 7 (MoonBit UsefulAST が一番手、kuu-cli self-hosting が最初の dogfooding)。いずれも既存 spec の予定地 (DESIGN §0.2) と生態系実証 (findings 参照) からの導出で、新規の飛躍は無い
- (b) 部分承認 — 保留したい柱を指定 (例「UX-Q1=a ただし柱 6 保留」の形で)

### UX-Q2: CLI envelope の厳密度 (柱 5 の各論、fail 302 件の解消方針)

parse サブコマンドの出力を fixture expect にどこまで寄せるか:

- **(a) 厳密一致 — expect に無いフィールドは出さない** (統括推し): message (人間向け文言) も scope も落とし、fixture protocol と byte 級で同形に。人間向け情報は将来の `--verbose` 等の opt-in に逃がす。conformance gate 化 (sweep を green gate に昇格) が最短で立つ。幻影コマンド (機械消費) の一貫性が最優先
- (b) 上位集合 — expect のフィールドは全部出し、余剰 (message/scope 等) は許容と spec に明記。人間にも機械にも 1 つの出力で応える。gate は subset 比較になる
- (c) 2 モード — 既定は厳密 (a)、`--rich` で余剰付き

### UX-Q3: sources の出力条件 (fail 最大系統の解消)

- **(a) resolve 済み出力には常に sources を含める** (統括推し): fixture の optional 検証と整合し、CLI 消費者 (script) が値の出所を常に機械判別できる。kuu.mbt の proj_sources は実装済みで CLI 配線のみ
- (b) fixture が expect している時だけ意味を持つ optional 扱いのまま、CLI では `--sources` opt-in

### UX-Q4: interpretations の resolve 相適用 (spec 未規定の解消、柱 5 + DR-053 §3)

ambiguous の各 interpretation に値源ラダー (env/config/default) を適用するか:

- **(a) 適用しない — parse 相の骨格 (result ビュー + claimants) のみ返す** (統括推し): ambiguous は「ユーザに選ばせる/定義を直させる」ための診断出力で、未確定の解釈に値源を注いでも意思決定に寄与しない。現 runner の姿勢とも一致し、fixture 追加も不要
- (b) 各 interpretation を独立に resolve して完全形で返す
- (c) 呼び出し側選択 (API パラメータ)

### UX-Q5: spec 側の先行宿題の扱い (骨子「先行宿題」3 件)

- **(a) completer/accumulator の descriptor 軸確定を issue 起票して次サイクルで先行着手、他 2 件 (result 構築の production 昇格 / interpretations 規定) は UX-Q2〜4 の裁定に従って同サイクルで解消** (統括推し)
- (b) 3 件とも issue 起票して別サイクル (ux 実装は宿題を避けて進める)

### UX-Q6: env/config/tty の CLI 注入インターフェイス (全数分類の最大カテゴリ 106 件、kuu-cli の docs/findings/2026-07-16-conformance-fail-taxonomy.md)

kuu-cli で値源ラダー系 fixture を通すには env/config/tty の注入手段が要る:

- **(a) `--env k=v` (繰返し可) + `--config <json|file>` + `--tty <spec>` のオプション注入 + 実環境変数の既定継承は無し** (統括推し): 幻影コマンドは再現性が命 — 実環境の暗黙継承はテスト・スクリプト双方で毒。fixture の入力 3 軸と 1:1 に写り conformance gate にそのまま使える
- (b) 実環境変数を既定で継承し、`--no-env` 等で遮断 (実用寄り、再現性は劣る)
- (c) a を既定に `--env-passthrough` で実環境 opt-in (両立形)

### UX-Q7: CLI parse の resolve 適用条件 (bug 候補 1 件の真因、fixture の resolve フラグとの整合)

conformance fixture は `resolve` フラグ (または default ladder の必要性) で resolve 相の適用を選ぶが、現 kuu-cli は常時 resolve を適用する。この差で export-key/collision :: single-exposure-ok が kuu-cli だけ fail する (未発火 flag の preset default が resolve で充填され共露出キーに混ざる — kuu.mbt runner は green、参照実装は正)。

- **(a) CLI も既定 resolve 適用のまま、ただし resolve 相の意味論を fixture と同条件にする** (統括推し): 「kuu parse = ユーザが実際に使う完全なパース」の直感を維持。上の collision 件は「resolve 相でも preset default は共露出キーへ参加しない」を spec 側で明文化して解消 (fixture why の §divergence 保留の決着でもある)
- (b) `--no-resolve` opt-out を設け、conformance gate は fixture の resolve フラグに従って切替
- (c) a + b 両方 (既定 resolve + opt-out、gate はフラグ追従)

(回答例: 「UX-Q1=a, Q2=a, Q3=a, Q4=a, Q5=a, Q6=a, Q7=c」/ 自由文歓迎。Q2-4/6/7 は kuu-cli の envelope 追随タスクと spec fixture/DR 反映に直結するので、裁定後すぐ実装ラインに乗せる)


