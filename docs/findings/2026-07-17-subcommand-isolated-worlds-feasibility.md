# サブコマンド別世界構想 (per-command 独立 definition 合成) の実現可能性検討

> 検討対象: 「グローバルオプション以外、サブコマンドは完全に別コマンドと見るべき。installer / type / filter 等の registry を含めて完全に別世界を受け入れられるようにしたい。git.json や docker.json を commands に import して git / docker サブコマンドを持つコマンドを合成したい」(kawaz 構想、2026-07-17)。読み取り + 検討のみで、spec 本文・DR・fixture は変更していない。

## 判明した事実 (現行構造の観測)

現行アーキテクチャは、この構想にとって想定以上に有利な位置にいる。「command 部分木の独立性」は既に複数のレイヤで成立済みである:

1. **パース面の隔離は既に規範**: command 部分木は新しい背骨を宣言し、祖先の greedy は届かない (DESIGN §15.8、DR-042 不変則⑤)。スコープ越えの可用性は評価器の例外ではなく global installer の構造コピーでのみ表現される — つまり「唯一の越境は global」が既に裁定済みの構造 (DR-042 canonical セット表)。
2. **definitions は per-scope で shadow する**: definitions フィールドはトップレベルだけでなく各 scope に置ける (DESIGN §10.4)。解決順は「現在スコープ → 外側 → definitions → registry」(DR-032/035) で、子の定義が親・registry を shadow する。つまり「git 世界が独自の definitions.types / templates を持つ」ことは今日の wire で既に書ける。
3. **config 方言も per-scope**: `long_prefix` / `short_prefix` / `long_eq_sep` / `env_prefix` 等の installer config は DR-014 の階層継承 config であり、command scope 単位で上書きできる (DR-096 の要素単位 override 実例あり)。「git 世界だけ別方言」の大部分は registry を触らずに config 差分で既に表現可能。
4. **lowered 断面は per-scope の 5 面構造**: 入れ子 scope は再帰的に `{greedy, positionals, entities, constraints, templates}` の同型 5 面を持つ (DR-063 §3)。参照実装 kuu.mbt の `InstallBuilder` も `children: Array[InstallChild]` を持つ per-command のビルダーツリーで、`init_sb` が再帰構築する (kuu.mbt `src/engine/installer_ext.mbt:107`、`src/builtins/installer.mbt:978`)。「サブコマンド毎にサブパーサ」の骨格は実装上ほぼ実在する。ただし現行は `templates` map と `extensions` (Registry) を**ツリー全体で共有**して引き回しており、ここが per-world 化の変更点になる。
5. **registry は wire に載らない**: wire に現れるのは definitions 側のみで、registry はホスト言語側が注入する非ポータブル名前空間 (DR-061 §3)。canonical set の組成は assembly 層が所有し、subset assembly (組成の差し替え) は既に構想内 (DR-110 §2-3/§7)。
6. **SCB 裁定 (2026-07-17) が最後の意味論漏れを塞いだ**: 未選択 scope の値述語 (required / required_group) が評価に参加する実装挙動は、DR-103 §5 明確化により「遅延述語の評価は選択された scope のみ・group label 集約は scope 局所」と裁定された。裁定原理の文言そのものが「グローバルオプション以外、サブコマンドは完全に別コマンドと見るべき」であり、本構想と同一の原理。
7. **サブコマンドツリーは静的閉包が規範**: DESIGN §13.9 は「サブコマンドツリーの動的拡張 (git-foo バイナリ委譲・wildcard・catch-all) は責務外」と明記する。import (定義時の静的合成) は動的拡張ではないためこの規範と矛盾しないが、「合成は定義時に閉じる」ことが制約として効く。
8. **fixture の definition は単一 wire 文書**: conformance fixture は 1 ファイル = 1 definition (DR-065)。multi-file 参照の機構は無い。

## 実現可能性の判定

**現行アーキテクチャの延長で成立する。根本的な再設計は不要。** ただし「別世界」の到達可能な範囲に原理的な上限が 1 つある。

- **成立する根拠**: 上記の通り、背骨 (パース)・definitions (語彙 shadow)・config (方言)・constraints (SCB 裁定後)・結果射影 (scope ネスト) の 5 軸が既に per-scope で閉じているか閉じる方向に裁定済み。残る越境機構は有限個 (下の課題マトリクス) で、いずれも「world 境界でどう振る舞うか」の裁定を足せば済む増分であり、既存の不変則 (DR-042 の 5 不変則、DR-038 の完全経路一意性) を壊す要素は見当たらない。
- **原理的上限**: 「registry 含めて完全に別世界」のうち、**registry 住人の実装コードは wire で運べない** (実装はホスト側コード、DR-061 §3)。git.json が `contrib_git/refspec` 型を要求しても、import 先ホストにその住人が登録されていなければ動かない。到達可能なのは「**ホストに登録済みの住人の per-world な選択・組成・config**」まで — つまり別世界化とは「scope ごとに assembly 組成 (DR-110 §7 の subset assembly) を切り替えられること」と読み替えるのが正確。実装そのものの同梱は VISION §4 の WASM embed 構想が実現するまで不可能で、これは本構想の欠陥ではなく wire (純データ) の定義から来る境界。

なお「サブコマンド毎にサブパーサ」の直感には 1 つ補正が要る: パースは「トークン列を事前に切って子パーサへ渡す」形にはならない。早閉じ抑制と親背骨再開 (DESIGN §15.8 — 子が読めなくなったら親の背骨が再開する、sever 規則は持たない) がある以上、切断点は静的に決まらず、path-search は全域で 1 本のまま走る。サブパーサの実体は「per-scope の面構造 (5 面) + per-scope の語彙・config 環境」であり、これは現行の InstallBuilder ツリーの延長。子完了後に親へ戻らない「argv 末尾まで子が食う」getopt 的一体消費を world 境界の opt-in 規則として足すことは可能だが、それは別の裁定 (後述 W-Q4)。

## 課題マトリクス

「越境」= 現行 spec で scope 境界を跨いで作用する機構。難度: 低 = 既存裁定の適用で閉じる / 中 = 新規裁定 1 個で閉じる / 高 = 複数裁定 + 実装構造の変更を要する。

| 機構 | 現行の越境 | 別世界化での扱い案 | 難度 |
|---|---|---|---|
| 背骨 / greedy | 越境しない (DR-042 ⑤) | そのまま。world 境界 = command 境界の強化形 | 低 |
| 遅延述語 (制約) | SCB 裁定で選択 scope のみに確定 | そのまま (裁定済み) | 低 |
| 結果射影 / export_key | 越境しない (scope ネストで合成的、DESIGN §2.4) | そのまま。`export_key: null` の透過による親への昇格露出だけは world 境界で禁止するか要裁定 (子世界のキーが親の kv に混ざる) | 低 |
| complete クエリ | scope 切替に追随 (DR-060、生存経路の次の消費点) | 候補収集は自然に world 追随。completer 名の解決だけ per-world registry に従う | 低 |
| エラーの path 帰属 | element + scope path (DR-053) | world 修飾は既存 scope path で表現可能。import 由来のファイル帰属 (どの json から来たか) は合成ツールの source map の関心で spec 外に置ける | 低 |
| definitions / type / ref / link / alias の lexical 解決 | **越境する** (現在スコープ → 外側 → definitions、DR-032) | world 境界で外側 chain を切断し、fallthrough 先を「その world の registry 組成」にする。明示的な cross-world ref/link は definition-error (`absent-ref` の既存 kind で表現可能) | 中 |
| config 方言 (long_prefix 等) | 階層継承で流下する (DR-014) | 継承は便利だが別世界の独立性とは逆向き。world 境界では「親の config を継承しない (world 自身の宣言 + canonical default から開始)」に切るのが構想に忠実。opt-in で継承残しも可 | 中 |
| env | **プロセス大域** (env 名前空間自体が world 分離不能)。auto_env はスコープパスをフル修飾 (DR-049 §3) | 真の隔離は原理的に不可能と明記する。auto_env の導出は world root からのパスに切替え、`env_prefix` は import 側 scope config で上書き可能 (既存機構 DR-049 §4 で足りる)。git.json が明示 `env: "GIT_DIR"` を持つ場合はそのまま大域名を読む — これは仕様通りの挙動であり期待調整のみ | 中 |
| config ファイル (DR-050) | config_key は「ルート絶対」、同型対応は root からの name 階層。config_provider / config_file は canonical 単一 | (a) config_key の「ルート」を**宣言 world のルート**と再定義 (world 内で閉じる)。(b) 親 world の config ファイルに子 world が `git.*` としてぶら下がる同型対応は自然に成立。(c) 子 world 自身が config_file 要素を持つ場合、config installer の配線を scope 帰属にする必要がある — DR-050 射程外 (複数 config_file の合成) の実体化が必要 | 高 |
| global installer | **唯一の裁定済み越境** (親→子の構造コピー + link で親実体へ値同期) | 越境は維持 (構想の「グローバルオプション以外」の裏返し = グローバルは越境してよい)。ただし 2 つの新裁定が要る: (1) コピーされた宣言 (`long: true` 等) を**子 world のどの installer / config で展開するか** — 現行の不動点反復は per-scope config で展開するため、単ダッシュ方言の子 world では親の `--verbose` が `-verbose` として現れる。表面統一 (親の綴りを固定) か子方言追随かの裁定。(2) コピー衛星の link は world 境界を跨いで親実体を指す — 「cross-world link 禁止」の唯一の例外として合成機構自身に許可する明文が要る | 高 |
| inherit (値源ラダー 4 席) | **越境する** (祖先 scope chain の同名実体、DESIGN §11.2) | 値の流下はグローバルオプション族の挙動 (global と同じ「親の値が子に効く」方向) なので、world 境界でも維持が構想に整合。ただし「同名」マッチが偶然衝突する危険は world 間で増えるため、境界越えは opt-in (境界で切るのを default) にする選択肢もある — 要裁定 | 中 |
| inheritable | **逆方向に越境する** (子が祖先 scope へ prefix 付き入口をコピー、DR-059) | 子 world が親 world の表面に入口を注入する形であり、独立性と真っ向から衝突する。world 境界では**遮断を default** とし、import 側の明示 opt-in でのみ許可、が妥当。prefix 生成 (`<scope名>-<name>`) の綴りを親のどの方言で出すかという global (1) と同型の問題も同時に踏む | 中 |
| registry (installer / type / filter / completer / provider) | 1 パース実行 = 1 registry (assembly が組成、DR-110)。参照実装も `extensions` をツリー全体で共有 | per-world の registry 組成に拡張する。wire decode (DR-110 #19 の orchestrator) は world 境界マーカーで descriptor 集合を切り替え、unknown-vocab 判定 (所有集合の和、DR-061 §2) も per-world で計算する。「親と子で同名別実装の installer」は ns (DR-094) で別名にするのが第一解 (`builtin/long` vs `myco/long`)、同一 ns 同名で config 違いは configurable factory (DR-061 §3) で既に表現可能なので実は衝突しない — 真の衝突は「同名 ns 語彙に別実装」の場合のみで、これはホスト登録時の所有交差エラー (DR-042 ③) の world 化 | 高 |
| conformance fixture | 単一 wire 文書 (DR-065) | import を「定義時の決定的 pre-transform (合成) → 単一 wire」と定義すれば parse fixture は無傷。合成ステップ自体の検証は lowering fixture と同型の「合成前 multi-doc → 合成後 wire」の新 query を足す | 中 |

## 実装像スケッチ

### (a) wire form での import 表現

3 案の比較:

1. **インライン埋め込み (推奨)**: import の解決 (ファイル読込・URL 取得) は wire の外 — 呼び出し側 / 合成ツールの責務とし、wire は常に自己完結の単一文書。DESIGN §0.1 の「入力は前処理済み `Array[String]` (`@file` 展開は呼び出し側の責務)」と同じ設計態度の definition 版。wire 上には合成結果と **world 境界属性** (例: command 要素の `world: true`) だけが残る。境界属性が上記マトリクスの切断・切替の全セマンティクスを担う。
2. **$ref 的参照**: wire に `{"type": "command", "name": "git", "import": "./git.json"}` を許す案。wire の自己完結性 (DR-063 の交換形としての価値) が壊れ、loader 契約 (相対パス基準・失敗時挙動・セキュリティ) が spec に入り、conformance が multi-file 化する。得られるのは配布の便宜だけで、それは合成ツールで代替可能。**非推奨**。
3. **ファイルパス直書き**: 案 2 の特殊形で同じ欠点。非推奨。

案 1 なら「import は UsefulAST / DX / ツール層の糖衣、spec が規範化するのは world 境界の意味論のみ」という綺麗な分業になる。git.json / docker.json の合成は `kuu compose` 的なツール (または各言語 DX の import API) が行い、出力は普通の wire。

### (b) パース時の委譲境界

トークン列の物理分割は行わない (行えない)。委譲境界は現行どおり「スコープ入場 = 背骨切替」で、world 化で変わるのは評価環境 (語彙解決・config・registry 参照・matcher 構成) がスコープスタックの world フレームから引かれるようになる点。参照実装では:

- `init_sb` の再帰で `world: true` の子に対し `templates` / `extensions` (registry) を**共有引き回しせず、その world の組成で新調**する
- decode orchestrator は world 境界で descriptor 集合 (owns の和) を切り替える
- 完全経路一意性 (DR-038)・結末構造 (DR-053)・早閉じ抑制はグローバル契約のまま不変。子 world 内の ambiguous は全体の ambiguous

### (c) 段階的実現パス

1. **Phase 0 (完了)**: SCB 裁定 — 遅延述語の scope 局所化。構想の原理 (「サブコマンドは別コマンド」) が spec に初めて明文で入った。
2. **Phase 1 (低コスト・高価値)**: 「既に別世界であるもの」の明文化 DR。背骨・definitions shadow・per-scope config・制約・結果射影の 5 軸が per-scope で閉じていることを 1 本の DR に束ね、world 境界概念の予約 (`world` 属性名の予約だけでも可) を行う。実装変更ゼロ。
3. **Phase 2**: world 境界の意味論確定 — 上記マトリクスの「中」難度群 (lexical 切断・config 非継承・inheritable 遮断・env 再ルート・cross-world ref/link の definition-error)。fixture は既存 query で書ける (definition-error + parse)。
4. **Phase 3**: 越境 2 機構の裁定 — global の展開方言 (W-Q 級の設計判断) と config ファイル配線の scope 帰属 (DR-050 拡張)。ここが設計判断の本丸。
5. **Phase 4**: per-world registry 組成 + 合成ツール + 合成検証 query。DR-110 の subset assembly が前提になるため、kuu.mbt の 3 層分離 (engine/builtins/kuu) の完了後が自然な時期。

今すぐ決める必要があるのは **Phase 1 の「world 属性の予約」だけ**で、それも v1 スコープに入れる必然はない (command の属性追加は minor で足りる、DR-068)。逆に言うと、v1 前に「将来 world 化と矛盾する裁定をしない」ためのガードとして Phase 1 の DR だけ早めに立てる価値がある。

## 今日の SCB 裁定との整合

**独立ではなく、構想の第一歩そのもの。** DR-103 §5 の明確化 note に裁定原理として「グローバルオプション以外、サブコマンドは完全に別コマンドと見るべき」(kawaz) が既に引用されており、SCB-Q1=a (遅延述語は選択 scope のみ) / SCB-Q2=a (label 集約は scope 局所) は「制約」という 1 機構について world 隔離を先行実施した形。本構想はこの原理を語彙・registry・config へ一般化するものであり、方向は完全に一致する。SCB で採った「root scope は常に選択済み」「指定述語は committed 前提で元々 vacuous」という整理は、world 化後もそのまま成立する (world 境界は選択の有無を変えない)。

## 懸念・やらない方が良い点

1. **「完全な別世界」の看板は下げた方が良い**: registry 実装はホストコードであり wire で運べない以上、達成できるのは「per-world の組成・構成」まで。git.json を import して動くかは「ホストが git.json の要求語彙 (拡張 ns 含む) を登録済みか」に常に依存する。unknown-vocab エラー (DR-054) + descriptor による要求語彙の機械列挙 (DR-061) で「何が足りないか」は診断できるので、UX はそこで担保するのが正道。WASM embed (VISION §4) が来るまでこの線は動かない。
2. **方言混在 CLI は使用者に不親切**: `mytool git --foo` と `mytool docker -foo` が同居する CLI は、仕様上可能でも利用者体験としては疑問。kuu の「warn はする、reject はしない」(DR-021) に従い lint warn の素材にするのが整合的だが、「別世界を受け入れる」機能の主用途が本当に方言差の吸収なのかは一度問い直す価値がある。**主価値はむしろ「definitions / registry 要求 / config が衝突せず合成できること」(名前空間の衛生) にあり、表面方言の混在は副作用**、という整理を推す。
3. **global の展開方言問題は避けて通れない**: 親の `--verbose` を単ダッシュ子 world に落とすと `-verbose` になる (per-scope config 展開の自然な帰結)。「グローバルは親の綴りを保つ」を選ぶと、今度は「world 内の全トリガはその world の matcher 構成で読まれる」という現行の一様性 (DR-041 規則はスコープ従属) に例外が入る。どちらも一長一短で、ここだけは早い段階の裁定が必要 (Phase 3 に置いたが、Phase 2 の設計中に形が見えてくるはず)。
4. **世界切断を default にするか opt-in にするか**: 既存定義の互換性 (現行の lexical 連鎖・config 継承に依存した定義) を考えると、`world: true` の **opt-in が唯一の現実解**。「command は全部別世界」に default を倒すのは、ドラフト期といえども既存 fixture 群 (global 系・inheritable 系・inherit 系) の期待を広範に書き換える割に得るものがない。構想の「なんなら完全に別世界も受け入れられるように」は opt-in で十分満たされる。
5. **「サブパーサの独立実行」への深追いは非推奨**: world 境界で「子が argv 末尾まで一体消費する (親に戻らない)」規則を足せば真の物理委譲に近づくが、早閉じ抑制・親背骨再開の現行意味論と二重制度になり、`mytool git log -- rest...` 的な合成の自由度も殺す。必要になったユースケースが実在するまで持たない方が良い (dd の内部一体則で局所的には既に表現できる)。
6. **conformance の multi-file 化は回避すべき**: import を pre-transform と定義する限り fixture 形式は無傷で済む。wire に $ref を入れる誘惑 (配布の便宜) に乗ると、conformance・schema・well-formedness (DR-067) の全レイヤに loader の関心が漏れる。合成は道具、境界意味論だけが仕様、の線を守るのが安い。
