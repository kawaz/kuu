# codex レビュー #2 トリアージ判定 (DR-104/DR-105 サイクル)

> 統括検証 2026-07-14、codex レビュー #2 (`docs/findings/2026-07-14-codex-review-dr104-dr105.md`) のトリアージ。全 29 指摘 (Critical 4 + Major 21 + minor 4) を実機コード・DR 本文・schema・fixture の裏取りにより CONFIRMED / PARTIAL / REJECTED に判定する。CONFIRMED は指摘の核心が成立し反映が必要、PARTIAL は指摘の一部が成立 (過大主張や見落としを含む)、REJECTED は指摘そのものが事実誤認 (主に codex が schema/参照実装を未確認のまま書いた指摘)。判定内訳: CONFIRMED 15 / PARTIAL 11 / REJECTED 3。各判定の反映先は本ファイル各節末尾の「反映」に記す。

## 判定一覧

| ID | 判定 | 論点 |
|---|---|---|
| C-1 | PARTIAL | word の「改名」が実質的な必須フィールド削除 |
| C-2 | CONFIRMED | 候補同一性が3つの規則を同時に主張 |
| C-3 | PARTIAL | candidates 集合比較で dedup 契約を検証できない |
| C-4 | PARTIAL | DR-105 flatten の適用段階が未定義 |
| M-1 | CONFIRMED | args_after の省略と空配列が未定義 |
| M-2 | CONFIRMED | origin 必須規則と公式例が矛盾 |
| M-3 | CONFIRMED | candidate schema が tagged union でない |
| M-4 | PARTIAL | 省略=default と 省略=未検証 の混在 |
| M-5 | PARTIAL | completer が現行契約か将来予約か不明 |
| M-6 | CONFIRMED | term:cont が一件も conformance されていない |
| M-7 | CONFIRMED | 遅延述語5種のうち exclusive_group のみ fixture 化 |
| M-8 | CONFIRMED | constraint fixture が重複入力に暗黙依存 |
| M-9 | PARTIAL | after-filter 見出しが意味論を過大表現 |
| M-10 | CONFIRMED | after-filter の Ambiguous 生存規則が未 fixture 化 |
| M-11 | PARTIAL | dedup fixture が負側境界を検証していない |
| M-12 | CONFIRMED | 祖先 scope 和集合を直接 pin する fixture がない |
| M-13 | PARTIAL | ty 語彙が開いたまま enum になっていない |
| M-14 | PARTIAL | origin の canonicalization が不足 |
| M-15 | REJECTED | meta 必須化は運用止まり |
| M-16 | CONFIRMED | DR-105 flatten:false 宣言時の扱いが未定義 |
| M-17 | PARTIAL | 旧 accumulator:flatten の失敗契約がない |
| M-18 | PARTIAL | length_range の DSL 定義が不足 |
| M-19 | REJECTED | ARRAY filter の fallible ABI が未規範化 |
| M-20 | CONFIRMED | descriptor の carrier×fallibility 二軸が schema 上見えない |
| M-21 | CONFIRMED | unwrap_single/from_entries が語彙上 collector と衝突 |
| m-1 | CONFIRMED | hidden の説明が層混同 |
| m-2 | CONFIRMED | word_end のスペース可が hint か義務か曖昧 |
| m-3 | REJECTED | args.length と args_pos の関係の明記 |
| m-4 | CONFIRMED | 予約フィールドの受理動作が曖昧 |

## 各論

### C-1: word の「改名」が実質的な必須フィールド削除 — PARTIAL

核心の指摘 (『改名』というラベルが不正確で、実際は DR-060 §2 が課していた必須フィールド `word` を optional かつ v1 未実装へ格下げする実質的な意味論変更である) は事実として成立する。DR-104 §1 とその『波及』節経由で DR-060 §2 に追記された 2026-07-14 付の明確化 note は『word_before/word_after は本節が既に明記する「v1 未使用可」のまま』と主張するが、これは誤り — DR-060 §2 の原文 (改訂前) を読むと『v1 未使用可』の注記が付いているのは `word_suffix` (現 word_after) のみで、`word` (現 word_before) には付いていない (`word` は before と同様 `?` を持たない必須フィールドとして書かれている)。したがって DR-104 は DR-060 の記述を誤引用してまで『意味論不変』を主張しており、実際には (a) DR-060 が MUST として要求していたフィールドを (b) optional かつ実装しない状態へ dropdown する、という正真正銘の意味論変更を『改名』のラベルで覆い隠している。ただし codex が『未定義』として挙げる 4 点のうち後半 2 点 (prefix filtering は core が行うか生成器が行うか / カーソルが単語内にある入力を runner が reject すべきか) は実際には DR-060 §3 に明記済み — 『絞り込みポリシー (... prefix 絞り) は候補メタを見た生成器側の選択であり、kuu は固定しない』。これは参照実装 kuu.mbt `outcome.mbt` の complete() 直上コメントでも『prefix filtering by the cursor word ... is the generator's (層 2) and the shell's concern — kuu fixes no policy here』として明示的に踏襲されている。DR-104 はこの DR-060 §3 の規定を覆していない (関連節で DR-060 全体を参照しているのみ)。したがって『prefix filtering の主体』『reject か全候補返却か』は既存規定で解決済みであり、codex はこの既存規定 (DR-060 §3) を見落として『未定義』に含めている。残る 2 点 (`--po|` 時に args_before が `[]` か `["--po"]` か／v1 complete がトークン境界専用か) も、DR-060 §2 が `before` と `word` を最初から別フィールドとして分離定義していた設計 (『before: カーソル前のトークン列』『word: カーソル単語の前半』) から、args_before は確定済み完全トークンのみを含み進行中の部分単語を含まない、という帰結が導出可能ではあるが、DR-104/CONFORMANCE §4 のどこにもこの帰結を明示する記述がなく、fixture もすべてトークン境界のみ (`fixtures/complete/*.json` を全件確認、部分単語ケースが 1 件も無い) — この 2 点は実質的に未検証のグレーゾーンとして残る。総括: 『改名でなく能力削除』という診断そのもの、および DR-104 の DR-060 誤引用は CONFIRMED 相当。ただし『4 点すべてが未定義』という主張は過大 — 2 点は DR-060 §3 で既に解決済みの規定を codex が見落としている。

**根拠:**

- docs/decisions/DR-104-*.md:20 「word_before/word_after は v1 では未実装のまま予約する ... (DR-060 §2 の「v1 未使用可」と整合する未実装状態)」
- docs/decisions/DR-060-completion-query.md:25-26 (改訂前原文) 「word: "<カーソル単語の前半>", // 単語頭なら空」「word_suffix?: "<同・後半>", // ... (v1未使用可)」— `word` には `?` も『v1未使用可』の注記もなく、`word_suffix` にのみ付いている
- docs/decisions/DR-060-completion-query.md:34 (2026-07-14 追記の明確化 note) 「word_before/word_after は本節が既に明記する「v1未使用可」のまま」— word と word_suffix を一括りにする誤った遡及主張
- docs/decisions/DR-060-completion-query.md:42-43 §3 「絞り込みポリシー (... prefix 絞り) は候補メタを見た生成器側の選択であり、kuu は固定しない」— prefix filtering の主体は既に規定済み
- kuu.mbt/src/core/outcome.mbt:292-294 (complete() 直上コメント) 「prefix filtering by the cursor word, alias/hidden policy and insertion are the generator's (層2) and the shell's concern — kuu fixes no policy here」— DR-060 §3 の実装側 echo
- kuu.mbt/src/core/outcome.mbt:303-308 complete() の実シグネチャ `(root, before, defs?, after?)` に word 系パラメータが存在しない (DR-104 の引用通り)
- fixtures/complete/*.json 全10本の args_before はすべて完全トークン ("--port", "build", "x", "height", "--json", "--" 等) のみで、部分単語ケースが皆無 — codex 指摘通り境界専用しか検証されていない

**見落とし文脈:** DR-060 §3 (『絞り込みポリシー ... prefix 絞り』は生成器側の選択、kuu は固定しない) が『prefix filtering は core が行うのか生成器が行うのか』『単語内カーソル入力で全候補を返すべきか』の 2 点を既に明文規定しており、DR-104 はこの規定を覆していない。codex はこの既存規定 (および対応する kuu.mbt のコメント) を見落として『未定義』の一部に数えている。

**反映方針:** DR-104 §1 の記述を『改名のみ』から『DR-060 §2 の word 必須規定を明示的に supersede する』に書き換える。理由として (a) 参照実装は word/word_suffix いずれも未実装だった事実、(b) DR-060 §3 により prefix filtering は元々生成器の関心でありkuu core が word の値を消費する契約は無かったこと、を正確に記す。あわせて DR-060 §2 の 2026-07-14 明確化 note (『本節が既に明記する「v1未使用可」』) を修正し、word_suffix にのみ付いていた注記を word にまで拡大解釈していた誤りを訂正する。加えて CONFORMANCE §4 または DR-104 に一文追加: 『args_before はカーソル前の確定済み完全トークンのみを含み、カーソルが単語内にある場合も進行中の部分単語は含めない (DR-060 §2 の before/word フィールド分離設計に基づく)』と明示し、単語内カーソル時の candidates が単語頭カーソル時と同一集合になることを CONFORMANCE 上で pin する (少なくとも 1 fixture 相当の記述、実装差異が出ない旨の明記)。

### C-2: 候補同一性が3つの規則を同時に主張 — CONFIRMED

codex の引用は正確 (DR-104 §3 line45 の6フィールド規則、同節の outcome.mbt 引用「union over SPELLINGS, not over the scopes」、§4 line51 の「和集合はスペリングの和集合」、§2 line39 の completer wire 保持)。核心の矛盾は実在する: DR-104 §3 が正当化根拠として引用する outcome.mbt のコメントは『同じ綴りが読めるなら scope 差は無視、union over SPELLINGS not scopes』と述べるが、実際に complete() 内で使われる同一性判定 (outcome.mbt:315-343) は spelling だけでなく origin/ty/term/meta も含む 6 フィールド完全一致であり、真に『spelling の和集合』を実装していない。この乖離は仮想例ではなく DR-041 §4 の shadowing 節で明示的に是認された実在シナリオで顕在化する: 『別名の要素でも同じ `--verbose` を持てば衝突する』『同一スコープ内の重複は従来どおり静的 warn + 実行時 ambiguous (DR-021/038)』(DR-041-token-reading-semantics.md)。つまり同一スコープ内で異なる origin (別名の要素) が同じ trigger spelling を持つ構成は仕様上合法かつ想定済みであり、この時 complete() の 6 フィールド規則は origin が異なるため 2 候補を dedup せず残す — DR-104 自身が根拠として掲げる『union over spellings』という説明文と矛盾する具体的な観測可能挙動になる。Example 2 (completer 差) は現状 kuu.mbt の `Cand` 構造体 (node.mbt:656-664) に completer フィールド自体が存在せず未実装のため今すぐ再現可能ではないが、DR-104 §2 で wire オプトインとして正式に予約されているフィールドであり、identity 成分か否かが規定されていない点は将来の実装追随時に即座に効いてくる正当な仕様ギャップ。Example 3 (意味を持たないフィールドが同一性に参加) は fixture 比較用の `cand_str`/`cand_fields_str` (json_conformance_wbtest.mbt:4162-4216) では moot フィールドを明示的に "" に正規化しているためテスト層では緩和されているが、complete() 自身の内部 dedup ループ (outcome.mbt:315-343) は正規化せず生の Cand フィールドをそのまま比較しており、spec (DR-104 §2/§3) にもこの正規化を要求する記述がない。総合して『表示上の綴り集合』と『候補レコードの同一性』が未分離という codex の指摘の核心は成立し、修正要求 (identity key の明確化、completer の identity 成分可否の明記、moot フィールドの正規化規定) は妥当。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:45 『2 つの候補が同一とみなされるのは、spelling/is_value/ty/origin/term/meta の 6 フィールドが完全一致する場合に限る』
- docs/decisions/DR-104-completion-fixture-format.md:45 outcome.mbt 引用『union of what's readable" is a union over SPELLINGS, not over the scopes that offer them』
- docs/decisions/DR-104-completion-fixture-format.md:51 『DR-060 §1 の「和集合」は経路の和集合ではなくスペリングの和集合』
- docs/decisions/DR-104-completion-fixture-format.md:39 completer は『wire には持たせるが fixture では opt-in 検証』
- kuu.mbt/src/core/outcome.mbt:303-343 (complete() 本体): dedup ループが spelling/is_value/ty/origin/term/meta の6フィールド完全一致で判定 (origin/ty/term/meta を含む、path は含まない)。コメント『union over SPELLINGS, not over the scopes』は実際の判定条件 (origin含む6フィールド) より狭い主張をしている
- kuu.mbt/src/core/DR-041-token-reading-semantics.md (docs/decisions) §4 shadowing節: 『別名の要素でも同じ `--verbose` を持てば衝突する』『同一スコープ内の重複は従来どおり静的 warn + 実行時 ambiguous (DR-021/038)』— 同一spelling・異なるoriginの候補共存が仕様上合法かつ想定済みであることを直接裏付ける
- kuu.mbt/src/core/node.mbt:656-664 struct Cand に completer フィールドが存在しない (未実装、DR-104 §2 の注記と整合)
- kuu.mbt/src/core/json_conformance_wbtest.mbt:4162-4216 cand_fields_str/cand_str: フィクスチャ比較用の射影では spelling/ty を moot 側で "" に正規化しているが、これは outcome.mbt の内部 dedup ループには適用されていない

### C-3: candidates 集合比較で dedup 契約を検証できない — PARTIAL

『実装が [candidate, candidate] を返しても、数学的な集合へ正規化すれば candidates は同じになり dedup fixture は green になる』という具体的claim (=現行 conformance runner が重複を観測不能) は実装コードを確認した結果、事実誤認 — REJECTED。実際の比較実装 (kuu.mbt json_conformance_wbtest.mbt:4198-4229, 4456-4465) は `cands_set_str`: 各候補を正規化文字列化した後 `sort_items` (単純挿入ソート、重複除去なし) + `join_comma` (単純連結、重複除去なし) で連結文字列化し、期待側 (`dec_complete_case`, 4379-4384) も同じく sort_items+join_comma で作った文字列と `==` 比較している。dedup が壊れて complete() が [A, A] を返した場合、got="A_str,A_str" と want="A_str" は文字列として不一致になり test は正しく FAIL する — これは codex が『または』として提案する代替案『順序非依存 multiset 比較 + identity 重複は即 fail』そのものであり、現に実装済み。一方で、CONFORMANCE.md/DR-104 の文言自体 (『集合比較』とだけ書く) が set と multiset のどちらを指すか明示的に書き分けていない点は事実であり、これ自体は正当な文書ギャップ。特に CONFORMANCE.md §3 (line113) は `interpretations` について『重複解釈の dedup 可否は...本書では定めない』と明言する前例があり、`candidates` の集合比較 (line119) にも同じ曖昧さが読み込める余地が残る。ただし `candidates` は DR-104 §3 で dedup が明確に normative (『1件に畳まれる』) とされている点で `interpretations` と非対称であり、この非対称性を CONFORMANCE.md が明示していないのは記述漏れ。結論: 『現在の runner が壊れている』という具体的主張は誤りだが、『spec 文言が multiset であることを明記していない (将来の別実装が set 解釈で誤って実装しうる)』という抽象的懸念は正当で、明確化ノートの追加は有益。JSON Schema の `uniqueItems` に関する補足指摘 (『あっても不十分』) は事実として schema 側に `uniqueItems` は使われておらず (grep で確認、ヒットなし)、そもそも不使用なので的外れではないが空振りの指摘。

**根拠:**

- kuu.mbt/src/core/json_conformance_wbtest.mbt:4219-4229 `cands_set_str`: `sort_items(items); join_comma(items)` — 重複除去ロジックなし (multiset として振る舞う)
- kuu.mbt/src/core/json_conformance_wbtest.mbt:4379-4384 `dec_complete_case`: fixture 側の期待値も同じく sort_items+join_comma で文字列化 (重複除去なし)
- kuu.mbt/src/core/json_conformance_wbtest.mbt:4456-4465 `run_complete`: `got == c.exp_candidates` の単純文字列比較 — got 側に余分な重複があれば want と長さ・内容が食い違い FAIL する
- kuu.mbt/src/core/json_conformance_wbtest.mbt:94-106 `sort_items` (挿入ソート、要素除去なし), 109-120 `join_comma` (単純連結、要素除去なし)
- docs/CONFORMANCE.md:113 `interpretations` について『重複解釈の dedup 可否は「解釈の同一性」定義に従属し本書では定めない』— candidates (line119) には同様の明記がなく非対称
- docs/CONFORMANCE.md:119 `candidates ... は集合比較 (interpretations と同じ扱い)。各候補は...構造等価で比較する』
- schema/fixture.schema.json 全体 grep で `uniqueItems` はヒットなし (未使用) — codex の『uniqueItems だけでも不十分』は仮定の話で現状使われてすらいない

### C-4: DR-105 flatten の適用段階が未定義 — PARTIAL

codex の主張「flatten の適用段階が未定義」は核心部分で REJECTED。DR-105 §1 の『発火値が配列なら』の『発火値』は codex が見落とした既存の確立済み用語 — DR-034/DR-084 §1 が『multiple の畳み単位は発火値』『ref 要素の発火値は row』と定義済みで、DR-084 §2 は repeat 持ち ref 要素の発火値が具体的に T[] (row 配列) であることまで pin している。つまり flatten の配列判定対象は raw piece でも cell_filters 後でもなく『各発火の pieceProcessor 出力 (post value_filters、pre accumulation)』であり、この意味論はスカラー要素 (T) にも ref+repeat 要素 (T[] row) にも一様に適用できる — 実際 kuu.mbt の現行実装 (resolve.mbt:517 の `vals.push(b.value)`、b.value は既に完全処理済みの Value) はこの読みと整合する。codex の 8 項目のうち: (1) raw/processed/post-cell_filters のどれか→発火値=post value_filters pre accumulation で確定 (accum_filters は DR-102 §1/§4 により累積『後』の配列全体にのみ効くため flatten 判定より後段)。(2) prevs結合式→DR-105 §1 本文に明記 (『発火値が配列ならその要素を1段だけ積む』『既定 false は丸ごと1要素として積む』)。(3) 空配列→『要素を積む』の自然な帰結として0要素追加、事実上曖昧性なし。(5) 旧 flatten の default_collector:identity 継承→DR-105 自身が引用する DR-036 の accumulators 表で append の default_collector は既に "identity" (DR-036:39-41)、codex は自分が引用した表を読み切れていない。(6) 現行 accumulator ABI への配線→DR-036 も他の accumulator config (separator 等) 同様、コード水準の関数シグネチャを spec で規定しない抽象度が既存慣習であり、spec 側の欠落ではなく実装 (kuu.mbt) 委譲として妥当。唯一 CONFIRMED相当の残存ギャップ: (4) 『非配列は[v]として追加するのか』(flatten:true かつ発火値が非配列の場合の結合式) — DR-105 §1 は flatten:false の場合の全体挙動と flatten:true の配列ケースは明記するが、flatten:true×非配列の組み合わせを独立の一文で明示していない。文脈上『配列でなければ既定 append と同じに丸ごと1要素として積む』以外の読みは考えにくく実務上ほぼ曖昧性はないが、一文の明確化 note を足す価値はある。

**根拠:**

- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:13 「`flatten: true` — 発火値が配列 (JSON array 相当) なら、その**要素を1段だけ**積む...既定 `false` は現行の `append` 挙動 (発火値を丸ごと1要素として積む) と完全に同一」
- docs/decisions/DR-084-multiple-ref-row-accumulation.md:9 「multiple の畳み単位は**発火値**...ref 要素の発火値は **row**」
- docs/decisions/DR-084-multiple-ref-row-accumulation.md:21 「repeat 持ち ref 要素の発火値は『repeat 1発火分のrow配列』(T[]...)」
- docs/decisions/DR-036-multiple-registry-accumulators-attribute-set.md:39-41 `"append": {..., default_collector: "identity", ...}` — flatten 統合前から append の default_collector は既に identity
- docs/decisions/DR-102-filter-attribute-split.md:14,40-42 `accum_filters` は『累積後の配列』にのみ効く (`T[]→T[]`)、reject 位置帰属も累積『後』の全体検証としての `argv.length` — flatten 判定が accum_filters より前段であることの傍証
- kuu.mbt/src/core/resolve.mbt:517-542 現行実装は各 binding の完全処理済み `b.value` (発火値) を vals に積む — raw piece でも cell_filters 後でもない

**見落とし文脈:** DR-034/DR-084 §1-2 が確立した『発火値』の用語定義 (post-pipeline 値、ref要素はrow=T[]) を codex は参照していない。DR-036 の accumulators 属性表 (append の default_collector が既に identity) も自分の引用内にあるのに読み切れていない。

**反映方針:** DR-105 §1 に一文追記: 『flatten:true かつ発火値が非配列の場合は既定 (flatten:false) と同じく発火値を丸ごと1要素として積む』。他の未定義事項は既存 DR (DR-034/084/036/102) への参照注記で足り、新規裁定は不要。

### M-1: args_after の省略と空配列が未定義 — CONFIRMED

DR-104 §5 と CONFORMANCE.md §4 はいずれも `args_after` の適用条件を「供給された場合」「与えられると」という presence 言語で記述し、length=0 での明示 supply (`args_after: []`) と omission が同値かどうかを normative に定義していない。fixture 側もこの区別を検証していない (grep で `args_after` を持つ case は 2 件のみ、いずれも非空配列)。唯一の手がかりは `no-after-both-triggers-survive` case の `why` フィールドの記述 (『args_after.length()==0 は無条件通過』) だが、これは case 1 件の説明文であり、schema/DR 本文の normative 規定ではなく、かつ「省略」であって「明示的に `[]` を supply」した場合を実際にテストしていない。参照実装 (kuu.mbt) は `after? : Array[String] = []` のデフォルト引数 + `if after.length() == 0 { return cands }` という length ベースの分岐であり、実装レベルでは『省略 = 空配列』が一意に成立するが、これは 1 言語の 1 関数シグネチャの実装詳細であって、他言語移植で JSON deserializer が『フィールド不在』を『空配列』にマップしない実装 (例: `Option<Vec<String>>` を保持し `None` と `Some([])` を区別する言語) が presence ベースで解釈しても、現行の DR/CONFORMANCE/schema/fixture のいずれからも矛盾を検出できない。CONFORMANCE §3 冒頭の『フィールド省略 = default 値と等価』という一般規約は §3『比較規約』配下にあり、その適用対象は `expect` 側 (出力) の比較規約であって、`cases[].args_after` という入力フィールドの解釈規約として明示的に流用されているとは読めない (§4 側の bullet はこの一般規約を参照していない)。したがって codex の指摘通り、spec 本文・fixture のいずれのレベルでも presence-sensitive か length-sensitive かが pin されていない、というギャップは実在する。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:61 — 「`args_after` が供給された場合は、after 整合フィルタが完全経路判定 (遅延述語込み) を行う。」(presence 言語、length 言及なし)
- docs/CONFORMANCE.md:149 — 「`cases[].args_after`: optional。... 与えられると after 整合フィルタ (§4 下記) が働く」
- fixtures/complete/after-filter.json:30 — no-after-both-triggers-survive の why: 「args_after を渡さない...args_after.length()==0 は無条件通過」(省略ケースのみ、明示 `args_after:[]` ケースは存在しない)
- grep 'args_after' fixtures/complete/*.json — after-filter.json:19 (`["5"]`) と constraint-non-participation.json:29 (`["--verbose"]`) の 2 件のみ、いずれも非空。明示的空配列 supply の fixture は 0 件
- kuu.mbt/src/core/outcome.mbt:307 — `after? : Array[String] = [],` (デフォルト引数、omission と `[]` を型レベルで区別しないシグネチャ)
- kuu.mbt/src/core/outcome.mbt:344 — `if after.length() == 0 { return cands }` (length ベースの分岐、presence ベースではない)

**見落とし文脈:** codex は参照実装の `after? : Array[String] = []` デフォルト引数シグネチャ (length ベースの一意な挙動) までは言及していないが、これは finding の妥当性を損なわない — むしろ『参照実装に寄せるなら空配列は省略と同値』という codex の推奨修正の裏付けになる。

**反映方針:** DR-104 §5 (または CONFORMANCE §4) に明確化 note を追記: 『`args_after` の省略と明示的な空配列 `[]` の供給は同値 (length ベース判定、参照実装 kuu.mbt `after? : Array[String] = []` のデフォルト引数と一致)』。加えて `fixtures/complete/after-filter.json` に `args_after: []` を明示供給する新規 case を追加し、`no-after-both-triggers-survive` (省略) と同一の expect (both triggers survive) を pin する。

### M-2: origin 必須規則と公式例が矛盾 — CONFIRMED

DR-104 §2 表 (docs/decisions/DR-104-completion-fixture-format.md:36) は `origin` を「必須」と明記し、schema/fixture.schema.json:372 の `candidate.required` にも `origin` が入っている (実装側でも必須)。さらに fixtures/complete/*.json 全 10 本 (basic-boundary.json 他) は exact 候補にも例外なく `origin` を書いている (grep で全件確認済み)。にもかかわらず DR-104 §2 冒頭の公式例 (DR-104-completion-fixture-format.md:25) と CONFORMANCE.md §4 の公式例 (CONFORMANCE.md:139) は、どちらも exact 候補 `{"spelling": "--port", "is_value": false, "term": "word_end", "meta": {...}}` に `origin` を欠いている。これは実装・schema・実 fixture の全てと矛盾する、DR/CONFORMANCE 文中の例示のみのバグ。修正は codex 提案通り両公式例に `"origin":"port"` を足すだけで足りる (低コスト、契約自体の変更は不要)。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:25 — `{"spelling": "--port", "is_value": false, "term": "word_end", "meta": {...}}` (origin なし)
- docs/decisions/DR-104-completion-fixture-format.md:36 — `origin` | 由来要素名 | 必須
- docs/CONFORMANCE.md:139 — 同型の origin 欠落例
- schema/fixture.schema.json:372 — `"required": ["is_value", "origin", "term", "meta"]`
- fixtures/complete/basic-boundary.json 他 10 本全て — exact 候補にも origin を明記 (実演)

**見落とし文脈:** codex 自身は指摘の中で fixture 実態が origin を持つことに言及しており、この点は正確に裏取りできている。見落としではない。

**反映方針:** DR-104-completion-fixture-format.md:25 と CONFORMANCE.md:139 の exact 候補例に `"origin":"port"` を追加する (docs のみの修正、schema/fixture 変更不要)。

### M-3: candidate schema が tagged union でない — CONFIRMED

schema/fixture.schema.json:338-374 の `candidate` は単一 flat object であり oneOf/if-then による tagged union になっていない。`required` は `[is_value, origin, term, meta]` のみで、`spelling` (is_value:false で実質必須) も `ty` (is_value:true で実質必須) も required に入っていない。従って codex が示した反例 `{"is_value":false,"origin":"x","term":"word_end","meta":{...}}` (spelling 欠落の exact 候補) や `{"is_value":true,"origin":"x","term":"word_end","meta":{...}}` (ty 欠落の value 候補) は現行 schema で valid になる。wire.schema.json 自身は「構文層のみを検査し語彙層は runner の関心」という設計方針を明言しているが、fixture.schema.json はその適用対象が違う (任意の definition ではなく fixture 著者が書く expect データの lint が目的) ため、oneOf 化して「書き手のミス」を機械的に弾く価値がある。Major 級の指摘として妥当。

**根拠:**

- schema/fixture.schema.json:338-374 — candidate は type:object の単一定義、oneOf/if-then なし
- schema/fixture.schema.json:372 — required は [is_value, origin, term, meta] のみ、spelling/ty を含まない
- docs/decisions/DR-104-completion-fixture-format.md:33,35 — 「is_value:false では実質必須」「is_value:true では実質必須」という DR の意図が schema に反映されていない

**見落とし文脈:** なし。

**反映方針:** schema/fixture.schema.json の candidate を oneOf 2 分岐に変更: exact (is_value:false, spelling/origin/term/meta required, ty/completer 禁止) と value (is_value:true, ty/origin/term/meta required, spelling 禁止または "" のみ許可, completer optional)。

### M-4: 省略=default と 省略=未検証 の混在 — PARTIAL

CONFORMANCE.md §3 冒頭 (line 110) の一般規約「フィールド省略 = default 値と等価」に対し、同じ §3 内で `reason`/`kind`/`help_entry`/`tried_triggers`/`completer` は明示的に「opt-in (書けば検証、書かなければ未検証)」、`candidates[].meta` は「省略不可・常に書く」と個別に override されている (CONFORMANCE.md:119)。読み手がこれらを field ごとに拾い読みしないと全体像が掴めない構造は事実であり、codex の「表にまとめるべき」という改善提案自体は妥当。ただし各 field の分類自体は既に個別に明文化されており (spelling=省略→""と等価の正規化、meta=省略不可、completer=opt-in 未検証)、判定不能なほど『定義が矛盾』しているわけではない — CONFIRMED というより「未タブ化のドキュメント読みにくさ」の指摘。Major (release blocker 級) というより整理提案レベル。

**根拠:**

- docs/CONFORMANCE.md:110 — 「構造等価...フィールド省略 = default 値と等価」
- docs/CONFORMANCE.md:119 — 同節内で meta は「省略不可」「常に書く運用」、completer は「opt-in 検証」と個別に override
- schema/fixture.schema.json:363-369 — meta と completer の schema 上の扱いも実際に異なる (meta は required、completer は required に入らない)

**見落とし文脈:** 各 field の override は §2/§3 の該当箇所に個別記載済みであり、「矛盾している」というより「一覧表になっていない」という体裁上の指摘に近い。

**反映方針:** CONFORMANCE.md §3 に candidates 各 field (spelling/is_value/ty/origin/term/meta/completer) の分類表 (normalization-default / required-no-default / opt-in-untested) を追加する。

### M-5: completer が現行契約か将来予約か不明 — PARTIAL

DR-104 §2 (line 39) は completer を「wire には持たせるが fixture では opt-in 検証 (書けば検証、書かなければ未検証)」と明記しており、これは §1 (line 20) の word_before/word_after の「v1 では未実装のまま予約する...fixture では書かない」という明示的な禁止指示とは異なる scheme である。実 fixture 10 本を grep した結果、completer を書いている fixture は現状ゼロ件 (未着手のまま)。従って「今日 fixture 作者が completer を書けば現行実装を正当に fail させられる」という codex の懸念は理論上正しいが、(a) 現実には誰もまだ書いていない、(b) この project の opt-in field は一般に『まだ実装されていない機能を先んじて fixture に書いて他実装の追随を促す』ためのものであり (reason/tried_triggers 等と同型の設計思想)、reference 実装自身が未実装の状態で fixture が先行して red になること自体は許容された運用パターンの範囲内、と評価できる。ただし word_before/word_after には「fixture では書かない」という明示的な釘刺しがあるのに completer には同等の注記がなく、非対称なドキュメント記述であることは事実であり、この点は改善の余地がある。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:20 — word_before/word_after「v1 では未実装のまま予約する...fixture では書かない」
- docs/decisions/DR-104-completion-fixture-format.md:39 — completer「wire には持たせるが fixture では opt-in 検証」「参照実装の Cand にはまだ completer 名フィールドが存在せず...実装側の追随タスクとして残る」
- fixtures/complete/*.json 全 10 本を grep — completer フィールドを書いている fixture はゼロ件 (未着手)
- schema/fixture.schema.json:367-369 — completer は candidate.required に含まれない (opt-in のまま schema にも反映済み)

**見落とし文脈:** 他の opt-in field (reason/tried_triggers/help_entry) と同型の設計パターンであり、opt-in 自体が矛盾した規則というわけではない。実際に書かれた fixture が今日存在しない以上、直ちに実装を fail させる実害は発生していない。

**反映方針:** DR-104 §2 の completer 説明に word_before/word_after と同様「参照実装が追随するまで fixture では書かない」旨の一文を明記して非対称性を解消する。

### M-6: term:cont が一件も conformance されていない — CONFIRMED

codex の事実主張 (term:"cont" の conformance がゼロ、wire enum の半分と after-filter の明示例外が未検証) は実測で完全に裏付けられる。さらに fixture 側の 'why' 文言自体が cont 系候補の検証を『別 fixture の関心』として明示的に先送りしていながら、その別 fixture が結局作られていない — 単なる見落としではなく、既知の未完了 TODO がそのまま残っている状態。加えて kuu.mbt 実装を読むと、既定 long_eq_sep:allow では同一 origin から word_end と cont の 2 候補が同時に発火することが確認でき、これは codex が提案する必要 fixture の 3 項目全てと正確に対応する。3 ケースの要求は DR-104 本文が既に個別に言及している独立した意味論的事実 (cont の存在自体・after-filter 免除・word_end との併存 identity) に 1 対 1 対応しており、過剰網羅ではない。

**根拠:**

- docs/findings/2026-07-14-codex-review-dr104-dr105.md:369-390 (M-6 本文)
- fixtures/complete/basic-boundary.json:2 — 「既定 "allow" だと eq-split 由来の追加候補 (term:cont) も同時に出るため、matcher 元綴りの輪郭は別 fixture の関心」(cont 系検証を明示的に別 fixture へ先送り、しかし作られていない)
- fixtures/complete/dr097-pending-mode-split.json:2 — 同じ先送り文言の反復 (「basic-boundary.json と同じ関心分離」)
- grep '"cont"' fixtures/ 実行結果: 0 件 (fixtures/complete/ のみならず全リポジトリで term:"cont" の期待値が皆無)
- docs/decisions/DR-104-completion-fixture-format.md:37 — term 行「"word_end"(確定、スペース可) / "cont"(継続、--key= の後等スペース不可) | 必須」(wire enum が cont を必須語彙として含む)
- docs/decisions/DR-104-completion-fixture-format.md:61 — 「値位置候補・term:"cont" の候補は after 整合フィルタの対象外...無条件で通る」(明示的な例外規定、fixture 化されていない)
- kuu.mbt/src/core/matcher.mbt:80-105 (matcher_cands) — EqSplit エントリは term=Cont の候補を生成する実装が現存
- kuu.mbt/src/core/installer.mbt:1703-1724 — long_eq_sep != EsRequire では space-form (WordEnd) main entry も同時登録され、eq-split (Cont) と併存する (M-6 の必要 fixture #3 が実装上も意味を持つことを確認)
- kuu.mbt/src/core/outcome.mbt:299,349 — after-filter で `c.is_value || c.term == Cont` が無条件生存の実装分岐

**見落とし文脈:** なし。むしろ fixture 側の 'why' に先送り宣言があるという codex が引用していない補強証拠を発見 (basic-boundary.json / dr097-pending-mode-split.json)。

**反映方針:** fixtures/complete/ に新規 1 本 (例: eq-split-cont.json) を追加し、long_eq_sep:"allow" 下で (1) --key の word_end 候補と --key の cont 候補が同一 origin で併存する identity 固定、(2) args_after 供給時に term:cont 候補が after 整合フィルタの対象外として無条件生存することを 2 ケース程度で pin する。

### M-7: 遅延述語5種のうち exclusive_group のみ fixture 化 — CONFIRMED

DR-104 §5 は required/required_group/requires/exclusive_group/conflicts_with の 5 種類を一つの太字規範文で一括規定しているが、実測 grep で fixtures/complete/ 全 10 本のうち制約系キーワードが登場するのは constraint-non-participation.json の exclusive_group のみで、他 4 種は 0 件。さらに全リポジトリの query:complete fixture (10 本全て) を対象に grep しても他 4 述語は一件も出現しない。5 種は自己満足・group cardinality・方向性・二項関係とそれぞれ評価対象データ構造が異なり (constraint-non-participation.json 自身の 'why' も『排他相手が committed 済みでもその候補は普通に返る』という exclusive_group 固有の論拠で組み立てられている)、少なくとも requires (方向性) と required (自己充足) は exclusive_group の positive/negative パターンから機械的に導出できない。DR-104 が明示的に列挙した 5 分類それぞれに最低 1 対のケースを求めるのは、tdd-and-test-design の直交軸原則に照らしても妥当な粒度であり過剰要求ではない。

**根拠:**

- docs/findings/2026-07-14-codex-review-dr104-dr105.md:392-415 (M-7 本文)
- docs/decisions/DR-104-completion-fixture-format.md:55 — 「required/required_group/requires/exclusive_group/conflicts_with の全ての遅延述語は候補生成・dead end 判定に一切参加しない」(5 種一括の太字規範)
- docs/decisions/DR-104-completion-fixture-format.md:61 — 「args_after が供給された場合は、after 整合フィルタが完全経路判定 (遅延述語込み) を行う」(こちらも 5 種一括)
- fixtures/complete/constraint-non-participation.json:6-7 — definition の制約フィールドは exclusive_group のみ
- grep '"required"\|"required_group"\|"requires"\|"conflicts_with"\|"exclusive_group"' fixtures/complete/*.json 実行結果: exclusive_group の 2 行のみヒット、他 4 種 0 件
- grep で fixtures/ 全体の query:complete fixture (10 本) を対象に確認しても他 4 述語は 0 件

**見落とし文脈:** なし。

**反映方針:** constraint-non-participation.json に required (positional 必須充足)・required_group (group cardinality)・requires (方向性)・conflicts_with (二項関係、非 group) の各々について before-only 生存ケースと after-filter 除外ケースを 1 対ずつ追加する (計 8 ケース、既存 2 ケースと合わせ 10 ケース程度、または definition を分けた複数 fixture でも可)。

### M-8: constraint fixture が重複入力に暗黙依存 — CONFIRMED

constraint-non-participation.json の case 2 (exclusive-partner-excluded-by-after-consistency-check) を精査すると、期待候補 3 件中 --yaml の除外だけが exclusive_group の直接効果で、残る --json と --verbose の 2 件は『同一の非-multiple flag をもう一度打っても Success で冪等』という別の意味論が成立して初めて正しい (--json は args_before の再確認、--verbose は args_after と衝突する再確認)。この副次仮定はこの fixture の 'why' 内で『実機確認済み』と述べられているのみで、リポジトリ全体の query:parse 系 fixture を args 重複トークンで機械 grep しても該当ケースが 1 件もヒットしない (count 型の増分セマンティクスや lowering の脱糖等価性の fixture はあるが、非-multiple/非-repeat/非-count な平場フラグの二重発火=Success を独立に pin するものは存在しない)。DR-080 が『last-wins 再発火』という一般原則の存在を示唆する記述を持つのみで、こちらも独立 fixture による pin ではない。したがって exclusive_group を検証する目的の case が、未検証の別意味論への依存を暗黙に抱え込んでいるという codex の指摘は正確であり、tdd-and-test-design の軸分離原則に反する構図。

**根拠:**

- docs/findings/2026-07-14-codex-review-dr104-dr105.md:418-434 (M-8 本文)
- fixtures/complete/constraint-non-participation.json:26-37 (case exclusive-partner-excluded-by-after-consistency-check) — why に『--verbose を採用した経路...2 回目の --verbose は committed の冪等な再確認』『--json を採用した経路...も同じ理で残る』と明記、かつ expect.candidates に --json / --verbose 双方を含む
- expect.candidates (同ファイル同 case) が --json と --verbose の 2 件を含み、これらは各々 args_before/args_after との重複発火を経て初めて Success になる経路
- python 走査 (query:"parse" 全 fixture の args フィールドに重複トークンを持つケースの機械抽出): 0 件ヒット (非-multiple/非-count/非-lowering の『同一平場フラグ二重発火=Success』を独立検証する fixture が存在しない)
- docs/decisions/DR-080-merge-accumulator.md:31 — 『accumulator 無し要素の last-wins 再発火と同じ見え方』(一般原則の言及のみで、当該挙動を単独 pin する fixture の存在は示さない)

**見落とし文脈:** なし。むしろ codex 未引用の裏付け (query:parse 全 fixture への機械 grep で該当なし) を追加で確認できた。

**反映方針:** case exclusive-partner-excluded-by-after-consistency-check の args_after を "--verbose" ではなく、候補集合と重複しない別の unconstrained option (例 "--quiet" のような未使用フラグ) または positional に差し替え、--json 自身の重複発火問題も避けるため args_before の要素と重複しない構成に調整する。あわせて『非-multiple flag の重複発火=Success/冪等』を独立に pin する 1 fixture (query:parse、fixtures/complete/ 外) を別途起票する。

### M-9: after-filter 見出しが意味論を過大表現 — PARTIAL

codex の根拠引用は正確: DR-104 §5 の見出し (『制約...は before-only 補完の候補生存に不参加。`args_after` 供給時は完全経路判定が働く』) は候補種別による限定を持たない一般命題として書かれている。ただし同節の**本文 1 文目**は見出し直後にすぐ限定を明示している: 『各 exact 候補 (`term: "word_end"`) について... フル `parse()` を実行し...』、さらに同段落末尾で『値位置候補・`term: "cont"` の候補は after 整合フィルタの対象外...無条件で通る』と明記済み。CONFORMANCE §4 も同様の構造で、圧縮された bullet (line 149) の直後の bullet (line 152) で完全に正確な限定 (『値位置候補・`term:"cont"`の候補はこのフィルタの対象外』) を持つ。つまり codex が指摘する『過大な一般命題』は見出し/圧縮文だけを切り出した場合にのみ成立し、節全体 (見出し+本文) を読む読者には実際には正確な情報が既に揃っている — 『現在の「args_after なら完全経路判定」という一般命題は偽』という主張自体は文字通り正しいが、それは見出し単独の話であって、DR-104 §5 と CONFORMANCE §4 という契約全体が偽の命題を主張しているわけではない。修正要求のうち『本文』も書き換えを求めている点は過剰 (本文は既に正確)。よって『見出しの表現精度』の指摘は CONFIRMED、『契約として実装者を誤誘導しうる Major な穴』という重大性評価は過大と判断し PARTIAL とする。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:53 — 見出し「### 5. 制約 (遅延述語) は before-only 補完の候補生存に不参加。`args_after` 供給時は完全経路判定が働く」(候補種別限定なし)
- docs/decisions/DR-104-completion-fixture-format.md:61 — 本文「各 exact 候補 (`term: "word_end"`) について ... 値位置候補・`term: "cont"` の候補は after 整合フィルタの対象外 ... 無条件で通る」(見出し直後の同一節内で既に正確に限定済み)
- docs/CONFORMANCE.md:149 — 「与えられると after 整合フィルタ (§4 下記) が働く」(圧縮 bullet)
- docs/CONFORMANCE.md:152 — 「値位置候補・`term:"cont"`の候補はこのフィルタの対象外 (ユーザ入力を発明できないため無条件で通る)」(同一節内の直後 bullet で完全に正確)

**見落とし文脈:** codex 自身が引用した『同節末尾』の文言が既に codex の求める限定と同内容であること (= 修正要求の一般命題は本文において既に成立している) を、指摘の重大性評価に反映していない。見出しだけを読者が拾って本文を読み飛ばす懸念自体は妥当な documentation nit だが、conformance 契約としての実体的な underspecification ではない。

**反映方針:** DR-104 §5 の見出しのみ codex 提案通りに書き換える: 『制約 (遅延述語) は before-only 補完の候補生存に不参加。`args_after` 供給時、exact/`word_end` 候補に限り完全経路フィルタが働く』。CONFORMANCE §4 line 149 の圧縮 bullet も同様に『(exact/word_end 候補限定、値位置・`cont` 候補は対象外)』を一言追記。本文 (line 61 / line 152) は既に正確なため変更不要。

### M-10: after-filter の Ambiguous 生存規則が未 fixture 化 — CONFIRMED

DR-104 §5 は明示的に『`Success`/`Ambiguous` なら残し `Failure` なら除外する』と規定しており、これは参照実装 kuu.mbt の `match parse(root, toks2, defs~) { Success(_) | Ambiguous(_) => out.push(c) Failure(_) => () }` と一致する実コードパスである (design doc 上の願望ではなく実装済みの分岐)。しかし `fixtures/complete/` 配下 10 fixture 全件を grep しても 'ambiguous' の出現は 0 件で、after-filter を通過した完全経路が `Ambiguous` になるケースは 1 件も pin されていない。さらに DR-047 は『制約が ambiguous の解消に参加する』(構造の異なる複数の完全経路のうち制約を満たすものが複数本残れば ambiguous のまま) という設計を明記しており、これは complete の after-filter でも到達可能な状態であることが理論的に裏付けられる (仮想例ではなく DR-047 が既に規定する現象の帰結)。したがって、`Success(_) | Ambiguous(_) => out.push(c)` を `Success(_) => out.push(c)` のみに誤実装 (Ambiguous を落とす) した移植実装があっても、現行 10 fixture では検出不能というギャップは実在する。これは M-9 と異なり見出し/本文の表現精度の話ではなく、**実際に到達可能な分岐が 1 件も conformance されていない**という純粋な fixture カバレッジ欠落であり、DR-104 の contract 自体は明確 (曖昧さはない) だが検証が欠けている。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:61 — 「`Success`/`Ambiguous` なら残し `Failure` なら除外する」
- kuu.mbt/src/core/outcome.mbt:361 — `Success(_) | Ambiguous(_) => out.push(c)` (実装済みの分岐、design doc 上の記述と一致)
- grep -l 'ambiguous' fixtures/complete/*.json — 0 件ヒット (該当ファイルなし)
- docs/decisions/DR-047-constraint-evaluation-layering.md:45 — 「制約が ambiguous の解消に参加する: 構造の異なる複数の完全経路のうち制約を満たすものが 1 本だけなら...確定する」(裏を返せば 2 本以上残れば ambiguous のまま、という到達可能性の裏付け)

**見落とし文脈:** なし。codex の指摘は正確かつ完結している。

**反映方針:** `fixtures/complete/after-filter.json` (または新規ファイル) に、`args_before + [exact 候補] + args_after` が構造の異なる複数の完全経路を持ち `Ambiguous` として解決する definition/case を追加し、その exact 候補が `candidates` に残ることを pin する。これにより `Success(_) | Ambiguous(_) => out.push(c)` の `Ambiguous` 分岐が実装漏れした場合に fixture が red になることを保証する。

### M-11: dedup fixture が負側境界を検証していない — PARTIAL

fixtures/complete/dedup.json を実読した結果、cases は 1 件のみで positive merge case (同一 command 名 "build" が2つの独立 command 定義から供給され1件に畳まれる) のみを持つことを確認。挙げられた6項目のうち5項目は正当な未検証ギャップだが、最後の『path だけ異なる』は事実誤認 — REJECTED。既存の唯一のケースそのものが『origin="build" (両者とも command名が "build" で一致)・spelling/term/meta は完全一致・path (どちらの command 定義由来か) のみ異なる』構成で 1 件に畳まれることを検証している (kuu.mbt origin算出: eval.mbt:549-567 CmdSat の cand_trigger(name, name, ...) — origin=name="build" が両者で同一)。すなわち『path だけ異なる』は現在の dedup.json の正体そのものであり、codex が『特に最初と最後は DR の中心判断そのものです。現在の fixture は C-2 の矛盾を露呈させません』と強調する『最後』の項目は誤り。一方『最初』(=同じ spelling、異なる origin) は正しく未検証であり、かつ C-2 で確認した DR-041 §4 shadowing 節の『別名の要素でも同じ `--verbose` を持てば衝突する』『同一スコープ内の重複は...実行時 ambiguous』という明示規定により実在シナリオとして構成可能 — この観点は codex の指摘通り DR の中心的判断 (§3の一次原理と6フィールド規則の緊張関係) を露呈させる最重要ケースであり、M-11 の核心 (『DR の中心判断そのもの』への言及) は半分成立・半分誤り。残る3項目 (同一spelling/origin・異なるmeta、同一origin・異なるterm、値候補でtyが異なる) は理論上構成可能な境界であり、dedup.json が is_value:true (値位置候補) の dedup を1件も検証していない事実 (既存ケースは is_value:false の exact 候補のみ) も含め正当な指摘。『同一6フィールド・異なるcompleter』はC-2で確認した通り現状 kuu.mbt の Cand 構造体に completer フィールドが存在せず今は再現不能なテストであり、指摘としては将来的な妥当性のみ持つ (現時点では『欠落』というより『実装未到達につき保留』)。

**根拠:**

- fixtures/complete/dedup.json:2-23 (why + 唯一の case): 2つの command 定義がいずれも name="build" — origin文字列が両者で一致することを示す
- kuu.mbt/src/core/eval.mbt:549-567 CmdSat(name, child) の complete 分岐: `cand_trigger(name, name, TFlag, WordEnd, false, false, false)` — origin=name。両 command が同名 "build" のため origin が両者で同一になることの直接的根拠
- docs/decisions/DR-104-completion-fixture-format.md §3 (6フィールド同一性規則)
- docs/decisions/DR-041-token-reading-semantics.md §4 shadowing節: 『別名の要素でも同じ `--verbose` を持てば衝突する』『同一スコープ内の重複は...実行時 ambiguous』— 『同じ spelling、異なる origin』ケースが仕様上実在可能であることの根拠
- fixtures/complete/dedup.json 全体: is_value:true (値位置候補) の dedup ケースが1件も存在しない (既存唯一ケースは is_value:false の exact 候補のみ)

**見落とし文脈:** codex は dedup.json の唯一のケースが実際には『path だけ異なる (=origin/spelling/term/meta は完全一致)』構成であり、6項目のうち『path だけ異なる』はまさにこの既存ケースでカバー済みであることを見落としている。

**反映方針:** dedup.json に負側境界ケースを追加: (1) 異なる origin の要素が同一 spelling を legal に共有する構成 (DR-041 §4 shadowing 節の同一スコープ重複トリガを利用、例えば異なる名前の2オプションが同じ long="--x" を持つ定義) で2件のまま残ることを pin — これが C-2 の矛盾を最も強く露呈させる。(2) is_value:true の値候補同士で origin が異なれば畳まれないことを示す positive/negative ペア。(3) meta (is_alias/hidden/deprecated) が1つでも異なれば畳まれないことを示す negative ケース。completer 関連ケースは Cand 構造体に completer フィールドが実装されてから追加検討 (現状は kuu.mbt 側の追随タスク待ち、issue化が妥当)。

### M-12: 祖先 scope 和集合を直接 pin する fixture がない — CONFIRMED

command-scope.json は『親候補 → 消費 → 子候補』という排他的な切替のみを固定しており、親と子の候補が同一消費点で同時に和集合入りするケースを持たない。dedup.json は DR-104 §3 が原典で挙げる Or([Scoped("a",...), Scoped("b",...)]) の忠実な wire 化だが、これは同一階層の兄弟 scope 2 つが同一綴りに収束する『スペリング同一性』の検証であって、深さの異なる祖先-子孫が同時可視になる union の検証ではない。さらに調査で、DR-042 の `global` 属性 (祖先 scope のオプションを子孫 command scope へ宣言的コピーする機構) が実装・fixtures/command-scope/*.json (parse/lowering 系) で広範に検証済みの実在機能であることを確認したが、fixtures/complete/ 配下には `global` を使う fixture が皆無。つまり『親 option と子 option が同時に読める』という具体的で実装済みのシナリオが complete クエリの conformance では完全に未検証であり、codex の指摘は単なる仮説ではなく実装機能とのギャップとして成立する。

**根拠:**

- docs/findings/2026-07-14-codex-review-dr104-dr105.md:491-500 (M-12 本文)
- fixtures/complete/command-scope.json:16-37 — args_before 空では親のコマンド名のみ、args_before:["build"] では子 positional のみ、という排他的切替のみを固定 (同時可視性のケースなし)
- fixtures/complete/dedup.json:2,12-13 — 『2 つの独立した command 定義が同名 "build" を持つ構成』(同階層の兄弟 scope の収束、祖先-子孫の同時可視性ではない)
- docs/decisions/DR-104-completion-fixture-format.md:45,47 — 「異なる祖先 scope 経由で供給された同一綴りの候補は 1 件に畳まれる」
- docs/decisions/DR-042-installer-architecture.md:67 — global installer は『子孫 command スコープへ ref/link 衛星の宣言的コピーを追加』(祖先 scope のオプションが子孫からも読める実装済み機構)
- grep '"global"' fixtures/complete/*.json 実行結果: 0 件 (対して fixtures/command-scope/global.json, shadowing*.json 等 parse/lowering 系には global 使用 fixture が多数存在)

**見落とし文脈:** codex 自身は `global` 属性という具体的な実装機構までは引用していないが、指摘の核心 (『親 option と子 option の union』が未検証) は codex の推測ではなく実在の kuu 機能とのギャップとして裏付けられる、より強い根拠がある。

**反映方針:** fixtures/complete/ に 1 本追加し、`global:true` を持つ親 option が子 command scope 内でも候補として現れ、子スコープ固有の候補と同一 candidates 配列内で共存する (shadow されていない) ケースを 1 つ pin する。

### M-13: ty 語彙が開いたまま enum になっていない — PARTIAL

参照実装 kuu.mbt の node.mbt:65-88 で `Ty` は TStr/TNum/TInt/TFloat/TFlag/TBool/TCount/TNone の8値クローズド enum であり、DR-104 §2 の「等」は語彙が本当にオープンであることを意味しない — closed enum とちょうど一致する (「等」は誤解を招く記述で削るべき)。ただし codex の修正提案「`definition.type` と同じ enum を $ref 共有」は方向として誤り: wire.schema.json:30-32 の `type` フィールドは `registryIdentifier` (DR-028/094 の型参照糖衣、custom type 拡張を許す open な文字列パターン) であり、candidate.ty (解決済みの primitive kind) とは別概念。両者を同一 $ref にすると custom type 名がそのまま ty に出る誤った contract になる。一方 schema/fixture.schema.json:350-352 の `ty` は現状ただの `type:string` で enum 制約が一切無く、任意文字列が valid になってしまうのは実装 (Ty が閉じた 8 値) と乖離した実際の schema gap。さらに、kuu.mbt eval.mbt の `pend_value(...)` 呼び出し全箇所 (grep 30 件超) を確認したところ渡される Ty は TStr/TNum/TFloat/TInt/TBool の 5 種のみで、TFlag/TCount/TNone が値位置候補として出た例は 1 件も無い — 「flag/count/none が値位置候補として実際に出るのか不明」という codex の指摘は経験的に裏付けられ、これら3型を enum に含める根拠が無いという主張も正しい。

**根拠:**

- kuu.mbt src/core/node.mbt:65-88 — `enum Ty { TStr TNum TInt TFloat TFlag TBool TCount TNone }` の閉じた8値定義
- kuu.mbt src/core/eval.mbt — `pend_value(...)` 全呼び出し箇所 (grep) は TStr/TNum/TFloat/TInt/TBool のみで TFlag/TCount/TNone を渡す箇所は皆無
- schema/wire.schema.json:30-32 — `type` フィールドは `#/$defs/registryIdentifier` (open な registry 参照、custom type 拡張可)
- schema/fixture.schema.json:350-352 — candidate.ty は `"type": "string"` のみで enum 制約なし
- docs/decisions/DR-104-completion-fixture-format.md:35 — 「"string"/"number"/"int"/"float"/"bool"/"flag"/"count"/"none" 等」

**見落とし文脈:** codex は schema 本文 (wire.schema.json/fixture.schema.json) も参照実装 (Ty enum) も見ていないため、「ty は definition.type と同じ open 語彙」という前提そのものが誤り。実態は逆で、Ty は closed enum。

**反映方針:** schema/fixture.schema.json の candidate.ty に `"enum": ["string","number","int","float","bool"]` (もしくは Ty 全8値、ただし flag/count/none は値位置候補に出ない旨を DR に明記した上で enum からも除外) を追加し、DR-104 §2 の「等」を削る。definition.type との $ref 共有はしない。

### M-14: origin の canonicalization が不足 — PARTIAL

alias の origin canonicalization については、DR-057 §26 (「効果は canonical の実体セルへ...結果キーは canonical のみ」) という既存の一般原則が既にあり、fixtures/complete/meta.json が `-p`(canonical)/`-n`(alias)/`-o`(deprecated alias) いずれも `origin: "port"` (canonical 名) で候補を返すことを実 fixture として明示的に pin している (why 文中でも「いずれも同じ由来要素 port へ束縛する」と明言)。従って「alias 自身の名前か canonical target か」という問いは、DR-104 単体では明記されていないとも DR-057 の既存規約 + 実 fixture により実質的に解決済みであり、codex の言う『alias の1例だけでは一般規則になっていない』は overclaim。一方で ref/link 越しの origin、unnamed/generated element (lowering 産物)、repeat installer 由来要素等の edge case は、command-scope.json/dedup.json/dashdash-boundary.json のいずれにも直接該当する fixture が無く、DR-104 の文言 (「由来要素名」のみ) だけでは一般則として抽出関数化されていない。この部分は genuine gap。

**根拠:**

- docs/decisions/DR-057*.md:26 — 「効果は canonical の実体セルへ (link 同型)...結果キーは canonical のみ」
- fixtures/complete/meta.json — `-p`/`-n`/`-o` すべて `origin: "port"` (canonical) で候補を返す実例、why 文に「同じ由来要素 port へ束縛する」と明記
- fixtures/complete/dashdash-boundary.json — dd 自身は `origin: "--"` (自分自身の名)
- fixtures/complete/command-scope.json — command は `origin: "build"` (自分自身の名)
- fixtures/complete/dedup.json — 同名 command が異なる scope に存在するケースの origin dedup は pin 済み (ただし ref/link 越しのケースは無い)

**見落とし文脈:** alias の canonicalization は DR-057 の既存規約の帰結であり、DR-104 が独自に決めるべき『未定義の新規論点』ではない。codex はこの既存規定を見落としている。

**反映方針:** DR-104 §2 の origin 説明に「alias 経由の候補は DR-057 §26 に従い canonical 要素名を使う (fixtures/complete/meta.json で pin 済み)」の一文を足し、ref/link 越し・lowering 生成要素の origin 決定則は別途 issue 化する。

### M-15: meta 必須化は運用止まり — REJECTED

codex は前提 (提示物のプロンプト) で「schema 本文がないため schema の keyword 単位の監査はできない」と明言した上で本指摘を Major 級に挙げているが、実物の schema/fixture.schema.json は既に meta の必須性を schema/runner 双方で enforce している: `candidate.required` に `meta` が含まれ (line 372)、`candidateMeta.required` に `is_alias`/`hidden`/`deprecated` の3 boolean 全てが含まれ (line 384)、かつ `candidateMeta.additionalProperties: false` (line 385) で3フィールド以外を許さない。CONFORMANCE.md §3 の「常に書く運用とする」という文言だけを見て『運用止まり』と判断したのは、まさにタスク冒頭で警告されている「schema 本文を見ていない指摘」の典型例であり、実物確認により明確に REJECTED。

**根拠:**

- schema/fixture.schema.json:372 — `"required": ["is_value", "origin", "term", "meta"]` (meta を含む)
- schema/fixture.schema.json:376-386 — candidateMeta は `"required": ["is_alias", "hidden", "deprecated"]` かつ `"additionalProperties": false`
- docs/CONFORMANCE.md:119 — 「meta...省略不可...常に書く運用とする」という運用注記に加え、schema 側で機械的にも enforce 済み

**見落とし文脈:** codex 自身が「schema 本文が提示されていないため keyword 単位の監査はできない」と自己申告している通りの見落とし。運用注記だけでなく schema required + additionalProperties:false で二重に固定済み。

**反映方針:** 対応不要 (既に schema で enforce 済み)。

### M-16: DR-105 flatten:false 宣言時の扱いが未定義 — CONFIRMED

DR-105 §2 の見出しと本文が食い違っている。見出し (docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:17) は「flatten は append 専用 — 他 accumulator への宣言は definition-error」と value 非依存 (=存在そのものが禁止) に読める文言だが、直後の本文 (同md:19) は「flatten: true を append 以外の accumulator … に宣言することは … reject」と明示的に true 限定の条件を書いている。schema 側のコメント (schema/wire.schema.json:90) は見出しに寄せた「他 accumulator への宣言は definition-error kind=invalid-range (DR-105 §2)」という value 非依存の言い回しを踏襲しており、DR 本文 (true 限定) と schema コメント (無条件) の間で表現が割れている。§2 内の「merge との整理」段落 (同md:21) の「flatten を merge にも許すという選択肢は最初から意味を持たない」という記述は存在ベース (=flatten キー自体を許さない) 寄りの傍証だが、これも明文の決定文ではなく読み手の解釈に依存する。DR-102 §3 (docs/decisions/DR-102-filter-attribute-split.md:34) が確立した並走パターン「要素の宣言形と合わない属性は、その属性にどんな綴りが書かれていても常に invalid-range のみを報告する」は存在ベースの先例であり、DR-105 §2 はこの DR-102 §3 と「同型」と明記 (DR-105 md:19) しているため類推としては存在ベースを支持するが、DR-105 自身の決定文が truth 値条件を明記してしまっている以上、これは「類推で埋められる程度の曖昧さ」ではなく DR 本文の内部矛盾。fixture化も本サイクルでは保留 (DR-105 md:70) のため pin もされていない。DR-105 §2 に一文加えて「flatten キーの存在自体 (true/false いずれの値でも) が append 以外の accumulator では invalid-range」と明記すべき。

**根拠:**

- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:17 見出し「### 2. `flatten` は `append` 専用 — 他 accumulator への宣言は definition-error」(value 条件なし)
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:19 本文「`flatten: true` を `append` 以外の accumulator … に宣言することは … kind=invalid-range で reject する」(true 限定)
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:21 「flatten を merge にも許すという選択肢は最初から意味を持たず」(存在ベース寄りの傍証、決定文ではない)
- schema/wire.schema.json:90 「他 accumulator への宣言は definition-error kind=invalid-range (DR-105 §2)」(見出しの無条件表現をそのまま踏襲、body の true 限定は反映していない)
- docs/decisions/DR-102-filter-attribute-split.md:34 「その属性にどんな綴りが書かれていても常に invalid-range のみを報告する」(存在ベースの先例、DR-105 が同型と明言)

**反映方針:** DR-105 §2 本文に一文追記: 「flatten キーの宣言自体 (値が true/false いずれでも) が append 以外の accumulator では invalid-range」と明記し、schema コメントと DR 本文の表現を統一する。または false は許可 (default と同値なので正規化) と決めるならその理由を明示する。いずれにせよ保留中の definition-error fixture (merge×flatten 等) で false ケースも pin する。

### M-17: 旧 accumulator:flatten の失敗契約がない — PARTIAL

kind そのものは既存の一般原則から一意に導出できる: DR-061/DR-063 が確立する「wire 上の語彙は登録済み registry descriptor の owns 集合の和のみが正当、誰も所有しない語彙は unknown-vocab」という原則 (docs/decisions/DR-061-registry-descriptor-and-configurable-factory.md:19、DR-063-atomicast-serialization.md:21) は filters registry に限定されたものではなく、accumulators registry を含む DR-036 の 8 registry 区分全てに及ぶ一般原則 (accumulators は「multiple registry の追加 (7→8 区分)」の一区分、DR-036-multiple-registry-and-accumulators.md:5)。schema/wire.schema.json:87 の `accumulator` フィールドも enum 制約を持たない自由文字列であり、語彙妥当性判定は parse_definition 側の registry lookup に委ねられている — 1属性1registryパターン (DR-102 §2) と同型。したがって DR-105 削除後に旧名 `"accumulator":"flatten"` を書けば、accumulators registry の owns 集合に無い語彙として一意に kind=unknown-vocab に落ちる。codex が挙げた「invalid-range / deprecated warning / migration alias / schema rejection」の各読みはこの一般原則と整合しない (invalid-range は「構文上成立するが構成として不成立」のケース向けで、語彙自体が存在しないケースとは別カテゴリ、DR-082 §2)。ただし DR-105 の「波及」節 (md:70) が予告する definition-error fixture は「flatten × 他 accumulator」(=flatten ダイヤルの誤用、M-16 のケース) のみを挙げており、「旧登録名 flatten を accumulator 値として書く」という M-17 のケースは射程外 — DR-105 はこのケースを明示的に取り上げても pin してもいない。codex の「複数の読みがあり得て曖昧」という核心主張は一般原則で否定できる (REJECTED 相当) が、「DR-105 に明記/pin すべき」という修正要求自体は正当 (CONFIRMED 相当) — 両方が混在するため PARTIAL とする。

**根拠:**

- docs/decisions/DR-061-registry-descriptor-and-configurable-factory.md:19 「誰も所有しない語彙は DR-054 の unknown-vocab Error」
- docs/decisions/DR-063-atomicast-serialization.md:21 「登録済み installer descriptor (DR-061) の所有集合の和に含まれる語彙のみ。誰も所有しない語彙は DR-054 の unknown-vocab Error」
- docs/decisions/DR-036-multiple-registry-and-accumulators.md:5 (multiple registry の追加 7→8 区分、accumulators もこの一区分)
- schema/wire.schema.json:87 `"accumulator": { "type": "string" }` (enum制約なし、語彙妥当性は parse_definition 側に委譲)
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:70 波及節が予告する fixture は「flatten × 他 accumulator の definition-error fixture (DR-084 §3 の merge×ref と同型パターン)」のみで、旧登録名 flatten を accumulator 値として書くケースを明示していない

**見落とし文脈:** DR-054/061/063 の「登録済み registry の owns 集合外は unknown-vocab」という一般原則が accumulators registry にも及ぶこと。codex はこれを確認せず「専用 kind が必要かもしれない」という前提で書いている。

**反映方針:** DR-105 の波及節に一文追記: 「削除後に旧名 `\"accumulator\":\"flatten\"` を書いた場合は、accumulators registry の owns 集合に存在しない語彙として kind=unknown-vocab に落ちる (DR-061/063 の一般原則)」。あわせて definition-error fixture を 1 件新設して pin する。

### M-18: length_range の DSL 定義が不足 — PARTIAL

DSL の呼び出し形そのもの (コロン区切り、min/max の2引数、args は string で filter registry 側がキャスト) は DR-009 の一般原則 (docs/decisions/DR-009-filter-chain.md:33-41「args はすべて string、filter registry 側でキャスト」) と DR-105 §5 の明示的な「scalar 版 in_range:min:max と同型」宣言 (同md:43) により in_range から類推継承でき、codex が挙げた疑問の大半 (min<=max 必須か、非整数 bound、負数 bound、空 bound) は「in_range と同じ挙動 (parse_number でキャスト、min>max は特別扱いせず単に全滅する filter になるだけ、非数値は runtime reject)」という形で答えが出る。しかし codex の核心の疑問「malformed parameter は definition-error の何 kind か」は、参照実装 kuu.mbt 自身のコメントが示す通り in_range の時点で未解決のまま: filters.mbt の filter_in_range 実装コメント (kuu.mbt/src/core/filters.mbt:95-98) は「malformed argはfilter-run時に捕捉される runtime Err (`filter_rejected` フォールバック reason) であり、update の transform 名検査と違って filter DSL 引数の definition-time な arity/型検査は (yet) 存在しない」と明記している — つまり in_range の malformed args は definition-error ではなく runtime reject。これは DR-082 §3 (docs/decisions/DR-082-definition-error-fixture-format.md:29-31) が定める「装置引数の値そのものが不正で装置の構築 (compile 等) が失敗する場合は kind=invalid-argument (definition-time、regex_match のパターン compile 失敗が実例)」という一般原則と整合しない非対称 — regex_match は definition時compileでinvalid-argumentになるのに、in_range/length_range の数値パースはなぜ runtime 送りなのか、spec レベルで根拠付けられていない ("yet" という実装コメントの言葉が示す通り、未整備なのか意図的判断なのか不明)。DR-105 §5 はこの点に一切触れておらず、length_range は in_range のこの未解決状態をそのまま継承することになる。したがって「DSL 文法の構文的な部分」は類推で答えが出るが (codex の疑問の一部は過大)、「malformed parameter の definition-error kind」という核心は spec 上も参照実装上も未解決のままであり、codex の修正要求 (パラメータ grammar と kind を表で固定) には正当性がある。両方の要素が混在するため PARTIAL。

**根拠:**

- docs/decisions/DR-009-filter-chain.md:33-41 「args はすべて string、filter registry 側でキャスト」(DSL文法はcolon区切りのみを規定、grammar/型検証は各filterの責務)
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:43 「DSL 呼び出し形は scalar 版 in_range:min:max と同型」
- kuu.mbt/src/core/filters.mbt:95-98 filter_in_range のコメント「A malformed arg is … surfaced as an Err with the filter_rejected fallback reason (caught at filter-run time … no separate definition-time arg-arity check exists yet for filter DSL args, unlike update's transform-name check)」
- kuu.mbt/src/core/filters.mbt:108-141 実装: args.length()!=2 や parse_number 失敗はいずれも Err(("filter_rejected", …)) という runtime Result であり definition-error 経路ではない
- docs/decisions/DR-082-definition-error-fixture-format.md:29-31 (§3) 「装置引数の値そのものが不正で … 構築 (compile 等) が失敗する場合は kind=invalid-argument (regex_match のパターン compile 失敗が最初の実例)」— in_range/length_range の数値パース失敗がこの範疇に入るべきかは DR-085/DR-082 いずれにも明記がない

**見落とし文脈:** codex は kuu.mbt の filter_in_range 実装コメント (definition-time arg 検査が「まだ存在しない」という明示的な未整備宣言) まで確認しておらず、in_range 自身がこの点で未解決/非対称であることを見落としている。ただし逆に、この未解決自体が length_range にも及ぶという指摘の骨子は成立する。

**反映方針:** DR-105 §5 に一文追記して、length_range の malformed parameter (非数値・引数個数不一致) の扱いを明示する: in_range と同じ runtime reject (`filter_rejected`) を踏襲するのか、あるいはこの機会に definition-time 検査 (kind=invalid-argument) へ格上げするのかを裁定し、in_range 側にも遡及するかを決める。決定後、malformed parameter のケースを definition-error または runtime reject いずれかの fixture で pin する。

### M-19: ARRAY filter の fallible ABI が未規範化 — REJECTED

codex 自身が『schema 本文を見ていない』と断っている通り、まさにこの指摘は schema/descriptor.schema.json を読めば即座に解消する。同ファイルの `signature` フィールド (line 26-29) が DR-105 §4 を明示的に参照しつつ ARRAY filter registry の Validate/Transform を規範化済み: 『Validate = 入力を変えず成功か reject のみ...Transform = 入力から新しい値を計算し失敗しない』。これは codex が要求した『Validate 成功時は入力配列をそのまま返すのか』『Transform は絶対に reject しないのか』の両方に直接回答している。さらに型シグネチャ自体は DR-105 が新規に導入したものではなく、DESIGN.md §8.1/§8.3 (DR-105 の波及先として既に更新済み) が既に一般形として確立している: `FilterChain[A,B] = A → B raise ParseError | raise ParseReject` (§8.1) を `accum_filters` にも一様適用 (§8.3: 『accum_filters (collector相当): FilterChain[T[], T[]] (accum要素、累積後の配列に効く)』)。これは codex が提示した第2案『全 entry を Array[Value] -> Result[Array[Value], Reason] へ lift』と型として等価 (raise 効果 = Result への lift の言い換え)。残る『filter 列の途中で reject したら short-circuit か』は accum_filters 固有の未定義ではない — この性質は raise ベースの FilterChain 型そのものから来る一般属性で、piece_filters/value_filters/final_filters を含む全 4 filter chain 属性に等しく (未) 適用されるchain-wide の話であり、DR-105 や accum_filters に限定した規範化漏れとは言えない。codex の指摘は『accum_filters だけ signature が規範化されていない』という限定主張だが、実際には (a) signature は既に規範化済み (schema + DESIGN §8)、(b) 残る short-circuit の粒度は他の filter chain 位置と同じ既存の一般性の範囲内で、accum_filters が特別に劣っているわけではない。

**根拠:**

- schema/descriptor.schema.json:26-29 「signature: filter descriptor限定...scalar filter registry...と ARRAY filter registry...の両方に同じ二分法を適用する (DR-105 §4)。Validate = 入力を変えず成功か reject のみ...Transform = 入力から新しい値を計算し失敗しない」
- docs/DESIGN.md:593 `FilterChain[A, B] = A → B raise ParseError | raise ParseReject`
- docs/DESIGN.md:617 `accum_filters (collector 相当): FilterChain[T[], T[]] (accum要素、累積後の配列に効く)`
- docs/findings/2026-07-14-codex-review-dr104-dr105.md:660 (codex 自身の引用) 「ただし採用後の正確な signature が本文にない」— DR-105 本文のみを見ておりschema/DESIGN.mdを確認していないことの自認

**見落とし文脈:** schema/descriptor.schema.json の signature フィールド (Validate/Transform の意味論定義) と DESIGN.md §8.1/§8.3 の FilterChain 一般型定義を未確認。両方とも DR-105 の波及先として既に反映済み。

**反映方針:** 対応不要。強いて言えば DR-105 §4 本文に『signature の正確な定義は schema/descriptor.schema.json および DESIGN.md §8.3 を参照』という参照注記を1行足せば、DR-105単体を読む読者にも到達可能になる（任意の改善、必須ではない）。

### M-20: descriptor の carrier×fallibility 二軸が schema 上見えない — CONFIRMED

DR-102 §1 が『1 属性 = 1 registry = 1 語彙』(final_filters/value_filters/piece_filters は scalar filter registry の T→T、accum_filters は ARRAY filter registry の Acc→Acc) を明文で規定し、DR-105 §4 がその二分法に『同じ Validate/Transform 二分』を適用すると明記している。しかし実物 schema/descriptor.schema.json の構造化フィールドは kind (installer/factory/filter の3値) と signature (Validate/Transform の2値) のみで、carrier (scalar/array) を表す専用フィールドが存在しない。schema/builtin-descriptors.json でも scalar filter (in_range: kind=filter, signature=Validate) と ARRAY filter (length_range: kind=filter, signature=Validate) が同一の flat `filters` JSON オブジェクトに同居し、両者の kind/signature の組は完全に一致するため区別不能。carrier の情報は各エントリの description 自由文 (例: length_range の『Acc→Acc、accum_filters 相』) にのみ存在し、機械可読ではない。REFERENCE.md §filter一覧表 (565-569行) も同様に signature/reasons/自由文 description の3列のみで carrier 専用列を持たない。wire.schema.json 側も filterChain/filterItem.name は `registryIdentifier` の汎用パターンのみで、value_filters/accum_filters 等の属性ごとに許容 filter 名を enum 制限していない — DR-102 §3 自身が『正規のゲートは parse_definition、schema の if/then は補助であり必須ではない』と明言しており、JSON Schema 単体では carrier 区別を強制していないことを spec 自身が認めている。したがって『flat filters namespace + signature だけでは in_range と length_range の入力型 (carrier) を区別できない』という codex の指摘は実物と完全に一致する、実在する schema 上のギャップ。

**根拠:**

- schema/descriptor.schema.json:23 — `"kind": { "enum": ["installer", "factory", "filter"], ... }` (carrier を表す値が無い)
- schema/descriptor.schema.json:28 — `"signature": { "enum": ["Validate", "Transform"], ... }` (fallibility 軸のみ、carrier 軸なし)
- schema/builtin-descriptors.json:20-27 — `in_range`: `"kind": "filter", "signature": "Validate"` (scalar filter registry 所属、value_filters/final_filters で使用)
- schema/builtin-descriptors.json:55-63 — `length_range`: `"kind": "filter", "signature": "Validate"` (ARRAY filter registry 所属、accum_filters 専用、DR-105 §5) — in_range と kind/signature の組が完全一致し区別不能
- docs/decisions/DR-102-filter-attribute-split.md §1 — 『属性分割: 1 属性 = 1 registry = 1 語彙』の表 (final_filters→scalar registry, accum_filters→ARRAY registry)
- docs/decisions/DR-102-filter-attribute-split.md §3 — 『正規のゲートは parse_definition (…) schema/wire.schema.json の if/then は補助として併用してよいが必須ではない』(JSON Schema では carrier 強制をしない設計)
- docs/REFERENCE.md:565,569 — filter 一覧表が signature/reasons/自由文説明の3列のみで carrier 専用列を持たない

**見落とし文脈:** DR-102 §3 は carrier 判定の正規ゲートを parse_definition (実装側の definition-error 判定) に置き、JSON Schema は『補助』止まりと明言している。つまり carrier 未区別は無自覚な欠落ではなく『schema は語彙検証の完全体ではない』という一貫した設計方針の帰結ではある。ただし codex の指摘対象は descriptor 自身 (schema/builtin-descriptors.json) であり、この設計方針があっても descriptor の kind/signature だけを見て carrier を判定したい tooling (lint/doc生成/型付きクライアント) にとってのギャップは解消されない。

**反映方針:** descriptor.schema.json に carrier 用の任意フィールド (例 `domain: "scalar"|"array"`) を追加するか、少なくとも DR-102/DR-105 に『carrier の正本は wire 属性位置であり descriptor 自体は非区別、機械判定が必要なら wire.schema.json 側の if/then か parse_definition の owns 集合を参照する』という明確化 note を追記する。

### M-21: unwrap_single/from_entries が語彙上 collector と衝突 — CONFIRMED

『単なる文書 typo なのか、descriptor namespace が role を表さない設計なのか』という codex の二択に対し、実物の DR-036 §『collectors registry は新設しない (filters で代替)』が後者を明示的に採用したことを確認した — typo ではなく意図的設計であり、この点で codex の懸念は『判別できない』状態を脱している。しかし、それにより M-21 が指摘する構造的懸念 (= descriptor namespace が role を区別しない) は codex 自身が予告した通り『M-20 の問題がさらに強くなる』形で実在することが判明した: (1) descriptor.schema.json の kind enum は installer/factory/filter の3値のみで『collector』という値が存在せず、DR-036 の設計を選んでも『kind:"collector"』で明示する語彙自体が用意されていない。(2) 参照実装 kuu.mbt では unwrap_single/from_entries は value_filters/piece_filters/final_filters/accum_filters が共有する FilterDescriptor registry (Map、run: (Value, Array[String]) -> Result[Value,(String,String)]) を全く経由せず、resolve.mbt 内の直接名前分岐 (`"unwrap_single" => unwrap_single(r)`) で別ディスパッチされ、from_entries に至っては呼び出し規約自体が DSL colon-args ではなく `multiple.collector` の object 形 (`{key,value}`/`{key}`) から導出される FromEntries spec を引数に取る (`(RVal, FromEntries) -> RVal`) — value_filters 等の filter chain contract と全く異なる。schema/builtin-descriptors.json はこの実態上の相違を『kind:"filter"』の単一語彙に押し込めており、schema だけを読む consumer は unwrap_single/from_entries が通常の filter chain 経由で呼び出し可能だと誤解しうる。

**根拠:**

- docs/decisions/DR-036-multiple-registry-and-accumulators.md (タイトル) — 『collectors は filters 統合』
- docs/decisions/DR-036-multiple-registry-and-accumulators.md §『collectors registry は新設しない (filters で代替)』 — 『collector の型 (T[]→U) が filter の型 (A→B) に完全に乗る…責務を増やさない方が筋が良い』
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md 波及 — 『filters.unwrap_single / filters.from_entries (collector、DR-036/DR-044) の descriptor を新規収載』
- schema/descriptor.schema.json:23 — kind enum は `["installer", "factory", "filter"]` のみ、`"collector"` という値が存在しない
- schema/builtin-descriptors.json:66-77 — `unwrap_single`/`from_entries` はいずれも `"kind": "filter"` で登録
- kuu.mbt src/core/filters.mbt:45-51 — `FilterDescriptor.run : (Value, Array[String]) -> Result[Value, (String, String)]` (scalar filter chain 共通契約)
- kuu.mbt src/core/resolve.mbt:392-398 — `"unwrap_single" => unwrap_single(r)` という name 直接分岐、FilterDescriptor registry を経由しない
- kuu.mbt src/core/resolve.mbt:707-728 — `from_entries(r : RVal, spec : FromEntries) -> RVal`。FromEntries は `Entries`/`KeyValue(String,String)`/`KeyPromote(String)` の3形、DSL colon-args ではなく `multiple.collector` の object 形から導出
- kuu.mbt src/core/json_conformance_wbtest.mbt:2509-2510 — 『to_set/from_entries are DR-036 registry presets but NOT reachable through this simple by-name field: to_set has no runtime implementation at all yet, and from_entries (DR-044)…』(reference 実装が両者を通常 filter chain 経由で扱っていないことの直接証言)

**見落とし文脈:** DR-036 が『collectors registry を新設しない』と明示的に裁定しているため、codex の『typo か設計か判別できない』という不確実性の一方 (typo 説) は解消される。ただし codex がこの判別不能を理由に予告した『後者なら M-20 の問題がさらに強くなる』という帰結は、kind enum に collector 値が無いこと・参照実装の実ディスパッチが filter chain contract と乖離していることの2点で独立に裏付けられる。

**反映方針:** descriptor.schema.json の kind enum に `"collector"` を追加し、schema/builtin-descriptors.json の unwrap_single/from_entries を `kind:"collector"` に修正する (DR-036 の『filters 語彙を共有する』という設計意図自体は namespace 命名 `filters.unwrap_single` のまま維持してよいが、kind フィールドで role を区別可能にする)。あわせて DR-036/DR-105 に『collector の呼び出し規約は filter chain の colon-DSL args とは異なる (multiple.collector の object 形から派生)』という一言の明確化 note を追記する。

### m-1: hidden の説明が層混同 — CONFIRMED

meta.json のトップレベル 'why' は『complete API 自体は... 除外せず素直に候補として返す』(= kuu core 層の非除外性) と『「既定で除外だがメタには残す」直接実演』(= 生成器層のデフォルト表示ポリシーによる除外+メタ保持という 2 層合成の性質) を同じ文脈で並べており、後者の『既定で除外』は本 fixture (query:complete の core 呼び出しのみ) が実際には一切行使していない層の挙動である。DR-058 §1 を確認すると『help 一覧と補完候補の**両方から除外**する (判断は help/completion installer)』と明記されており、これは DR-056 が言う別レイヤ (『completion installer』) の話であって、DR-104/DR-060 §3 が言う kuu core の complete() クエリ (このfixtureが検証している対象) とは異なるレイヤである。fixture 自体が実際に pin しているのは『core は除外しない』という半分のみであり、『既定で除外』側は本 fixture の JSON 期待値のどの assertion にも現れない (生成器/installer 呼び出しが definition にも case にも存在しない)。したがって『直接実演』という表現は、実際に検証していないレイヤの挙動まで実演したかのように読める点で層混同である、という codex の指摘は妥当。

**根拠:**

- docs/findings/2026-07-14-codex-review-dr104-dr105.md:750-765 (m-1 本文)
- fixtures/complete/meta.json:2 — 『complete API 自体は... 除外せず素直に候補として返す — 「既定で除外だがメタには残す」直接実演』
- fixtures/complete/meta.json:15 — case why『complete API はこれを除外せず meta.hidden:true として素直に返す(「既定で除外だがメタには残す」DR-060 §3 の直接実演)』
- fixtures/complete/meta.json 全体の definition/expect には生成器・completion installer の呼び出しや表示フィルタ処理は一切登場しない (kuu core の complete() 単体呼び出しのみ)
- docs/decisions/DR-058-hidden-deprecated.md:9 — 『help 一覧と補完候補の**両方から除外**する (どちらも表示層の関心で、判断は help / completion installer の参照 DR-056)』
- docs/decisions/DR-056-vocabulary-ownership-vs-reference.md:10 — 『completion installer が同じ語彙から補完データを作る』(kuu core の complete() クエリとは別のコンポーネント)

**見落とし文脈:** DR-058 §1 の『補完候補』は kuu core の complete() クエリではなく DR-056 が言う『completion installer』(シェル補完スクリプト生成等の別レイヤ) を指すという裏付けを追加確認できた — codex はこの DR-058/DR-056 間の層区分までは引用していないが、指摘の核心 (fixture の 'why' が層混同している) はこの追加調査でむしろ補強される。

**反映方針:** meta.json の why を『core complete() は常に候補を返す (この fixture が pin する対象)。生成器/completion installer 側の既定表示ポリシー (DR-058 §1) は hidden 候補を表示対象から除外できるが、それは別レイヤであり本 fixture の検証範囲外』のように 2 文に分離し、『直接実演』という語を core 側の非除外性のみに限定する。

### m-2: word_end のスペース可が hint か義務か曖昧 — CONFIRMED

DR-104 §2 の `term` 行 (line 37) は「word_end (確定、スペース可) / cont (継続、`--key=` の後等スペース不可)」とだけ書いており、kuu.mbt 側の TermHint コメント (node.mbt:624-625: 'WordEnd = 確定, a space may follow; Cont = 継続, no space (a value must follow)') を読めば『スペース挿入が後続入力の解釈を壊すかどうか』という validator 相当の制約であることが分かるが、DR-104 の文言単体では『生成器が空白を入れてよい hint』なのか『空白を入れると解釈が壊れる制約』なのか判別できない。軽微だが正当な文書明確化要求。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:37 — 「word_end (確定、スペース可) / cont (継続...スペース不可)」
- kuu.mbt src/core/node.mbt:624-625 — TermHint のコメント「WordEnd = 確定, a space may follow; Cont = 継続, no space (a value must follow)」

**見落とし文脈:** なし。

**反映方針:** DR-104 §2 の term 説明に「スペース可否は表示 hint ではなく、後続トークンの解釈を壊さないかの制約 (cont の後に空白を挿入すると `--key=value` 形式の継続が破綻する)」の一文を追加する。

### m-3: args.length と args_pos の関係の明記 — REJECTED

codex が要求する明確化 (「error.args_pos = input args の要素数」「0-based index の one-past-end であることも併記」) は既に CONFORMANCE.md の failure outcome 節に明記されている。CONFORMANCE.md:74 は「`args_pos` は 0-based で、失敗が帰属する args トークンの位置を指す … どのトークンにも帰属しない失敗は `args.length` を指す … `final_filters`/`accum_filters` の reject (multiple 有無を問わず、確定した最終値・累積配列全体への一括検証であり特定トークンに帰属しない、DR-102 §4) がこれに当たる」と、まさに codex が求めている `args_pos` = `args.length` (0-based one-past-end) の関係を accum_filters を名指しして既に規定済み。DR-105 §4 (docs/decisions/DR-105...md:33) の「reject 時の位置帰属は `args.length` — DR-102 §4 が … すでに規定していたが … 本 DR の Result 化により、この規定が初めて実効化される」という文言は、新規に語彙を導入しているのではなく、この既存の CONFORMANCE.md/DR-102 §4 の規定を「初めて観測可能にする」という位置づけの明確化に過ぎない。したがって DR-105 §4 の「args.length」という書き方は非公式な言い換えではなく、CONFORMANCE.md が既に公式定義した language をそのまま踏襲したものであり、field 名 args_pos との対応も既存文書で読み取れる。codex は CONFORMANCE.md の該当節を確認せずに指摘したとみられる。

**根拠:**

- docs/CONFORMANCE.md:74 「`args_pos` は 0-based で、失敗が帰属する args トークンの位置を指す … どのトークンにも帰属しない失敗は `args.length` を指す … `final_filters`/`accum_filters` の reject … がこれに当たる」
- docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md:33 「reject 時の位置帰属は `args.length` — DR-102 §4 が … すでに規定していたが … 本 DR の Result 化により、この規定が初めて実効化される」(新規語彙導入ではなく既存規定の実効化の明確化)
- docs/decisions/DR-102-filter-attribute-split.md:40 argv_pos/argv.length という旧称での同一規定 (CONFORMANCE.md 側で args_pos/args.length に呼称統一済み)

**見落とし文脈:** CONFORMANCE.md の failure outcome 節 (args_pos の定義、0-based/one-past-end の明記) を確認していない。DR-105 §4 は独自に新語を持ち込んだのではなく、この既存定義を参照・実効化しているだけという位置づけを見落としている。

**反映方針:** 指摘不成立のため修正不要。強いて言えば DR-105 §4 に「(CONFORMANCE.md §failure の args_pos 定義を参照)」という一言リンクを足せば読者の往復コストは下がるが、spec上の欠落ではない。

### m-4: 予約フィールドの受理動作が曖昧 — CONFIRMED

schema/fixture.schema.json の `case` 定義は `additionalProperties: true` (fixture.schema.json:129 相当の case 定義ブロック) であり、`word_before`/`word_after` のような未知キーを書いても schema 検証は通る。DR-104 §1 (line 20) は「fixture では書かない」と著者向けの運用ルールを述べるのみで、実際に書かれてしまった場合に runner がそれを黙って無視すべきか、明示的に reject すべきかは規定していない。ただし、これは word_before/word_after 固有の問題というより、この schema 全体が draft 期の設計判断として additionalProperties を意図的に開いている (fixture.schema.json 冒頭の説明: 'DR-068 §3 によりドラフト期は $id を与えない') ことの一般的な帰結でもある。

**根拠:**

- docs/decisions/DR-104-completion-fixture-format.md:20 — 「word_before/word_after は v1 では未実装のまま予約する...fixture では書かない」(運用注記のみ)
- schema/fixture.schema.json — case 定義の additionalProperties: true (未知キーを拒否しない)

**見落とし文脈:** この曖昧さは word_before/word_after 固有ではなく、fixture.schema.json 全体が additionalProperties:true で緩く保たれている draft 期の設計判断の一部である点は codex の指摘に含まれていない。

**反映方針:** runner の契約 (CONFORMANCE §6) に「case オブジェクトに word_before/word_after 等の未サポートキーが存在した場合は fixture 不備として reject する」旨を一文追加するか、意図的な forward-compat の silent-ignore を明記する。
