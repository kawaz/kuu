# DR-097: 先食い・早閉じ抑制の「読める」の精密化 — トリガ一致から読みの成立へ

DR-096 の bare long (`long_prefix: ""` 無条件合法化) 固定の直後、kawaz が
`height height` / `height 168.5 height` / `height height 168.5` (`height:
number` の option + `rest: string[]` の positional) という 3 パターンの
fixture 化を提案した。3 例とも実機で現行実装は failure — DR-041 §4 の先食い
述語「読める」が**トリガ一致**で判定されており、値照合失敗 (`height` を値と
して number 照合できない) を positional 素通しへの解放に繋げる規定が無かった
ためだった。

## 発端: 繰り返した誤導出とその反省

この日はメイン (統括) 側が同根の誤導出を複数回犯していた。直前の DR-096
サイクルでも、`long_prefix: ""` と bare operand の衝突を一度「Ambiguous に
落ちる」という誤った帰結で着地させており (`docs/journal/2026-07-12-dr096-config-axis-reorganization.md`
参照)、実際は DR-041 の先食い規定が決定的に解決するものだった。kawaz の叱責を
受けてメインは DR-037/038/041 を体系として精読し直し、読み意味論の導出規律を
プロジェクトメモリに恒久化した上で、今回の `height height` 系ケースを DR-097
として起案する運びになった。

## DR-097 起案: 完全経路の存在としての定式化 (`649130e1`)

初稿は述語「読める」を「その greedy 読みを経由する §15.1 完全解決経路 (遅延
述語 §15.9 込み) が存在すること」と定式化した。DR-037 の全ルートチェック教義・
DR-038 の「経路を黙って潰さない」契約から演繹される精密化であり新規則の追加
ではない、という論証を添えた。同じ流れで DR-041 に Superseded (歴史) 節を
追記し (`7b8581a1`)、DESIGN.md §15.8 に「読める」の精密化を明記し (`a37ebee1`)、
`fixtures/matcher-readings/long-empty-prefix-typed.json` を新設して kawaz 提案の
3 例を固定した (`46739922` — この時点の kuu.mbt 現行実装は旧述語のままなので
3 件とも fail するのが RED の期待挙動)。姉妹 fixture
`long-empty-prefix-operand-collision.json` の `why` も新述語への参照に追従させた
(`05e14b89`)。

## codex レビューと実装実験、二重の反証

codex レビューが Major 3 件を指摘した: (1) requires 未充足による無言の
positional 格下げが起こりうる (制約充足の値源不問 DR-093 と絡む層逆転)、
(2) 早閉じ側の専用 fixture が欠如、(3) 述語の停止性が未言明。

並行して実装 worker が初稿の定式化 (「完全経路の存在」) をそのまま参照実装
(kuu.mbt) に実装し、conformance を回した。結果、既存 fixture **39 件が flip**
した。最小反例は `fixtures/dd/basic.json::missing-positional`
(`-a -b` + 構造的必須 positional `x` の欠落): flag `-b` の読み自体は健全
なのに、無関係な `x` の欠落が経路全体を殺すため `-b` が素通し解放されて
`x="-b"` という無意味な success に化けた。これは「値スロットを持たない flag
は常に成立する」という DR-097 自身の不変挙動の主張と定式化そのものが矛盾する
ことを意味した。加えて repeat 取り分選好 (DR-043) との文脈依存も見つかり、
判定を取り分選好の特定文脈の中で行うと「打ち切って先へ進めば完全経路がある」
場合を見落とすことが分かった。実装 worker はテスト側を通る形に書き換える
方向へは進まず、初稿の定式化自体が持つ設計矛盾として停止・報告した
(test-failure-no-tampering の実践例)。この実測が、codex の Major 指摘と並んで
述語の再定式化を後押しする決定打になった。

## 述語確定 (`6eb705d0`): parse 相の「読み自身の成立」へ

改訂版は述語を「トリガ発火に加え、その entry 自身の値スロット消費が argv
から確保でき (missing operand でない)、値空間照合 (parse 相、factory config
込み) を通ること」に絞り込んだ。**下流の帰結 (同スコープの他要素の充足、
遅延述語 §15.9、後続トークンの成否) は判定に参加しない。** 生成と裁定の
層分離を明文化: 素通し枝の**生成**は parse 相の情報だけで決まり、生成された
全枝の**裁定** (完全経路の勘定 DR-038、制約による経路選別 DR-047 §6-1、
held Error の取捨 DR-037) は従来の教義がそのまま司る。

この確定によって早閉じ側にも専用 fixture が必要になり、
`fixtures/command-scope/early-close-viability.json` を新設した (3 cases —
読みが成立する間はスコープを閉じられない対照 baseline、成立する読みが無け
れば閉じて親の背骨に返す精密化本体、制約未充足は退出判定に参加せず可視
failure のままという pin)。「停止性と有界性」節も追加し、述語が当該読みの
範囲 (トリガ + 自身の値スロット、高々数トークン) で閉じ下流探索を再帰参照
しないことを明言した。「制約 (遅延述語) の未充足は先食い・早閉じに影響しない」
という不変ノートも追加し、requires の充足が値源不問 (DR-093 — env/config
経由でも充足しうる) であることとの層逆転を、判定を parse 相で閉じることで
構造的に排除した。「採用しなかった案」節には初稿の定式化が新たに追加され、
上記の 39 flip・制約層逆転・repeat 文脈依存・停止性未言明の 4 点が棄却理由
として並んだ。

## 語彙統一 (`8a04ea13`)

決定文の確定後も論証 §1 と早閉じ節の一部に旧述語 (「完全経路の存在」)
の言い回しが残っていた。これを parse 相語彙 (「読み自身の成立」「値トークン
枯渇 / 値空間照合失敗」) へ統一する仕上げのコミットで DR-097 の文面を閉じた。

## kuu.mbt 側の実装 (`deaab851`, main 未反映・codex レビュー中)

`greedy_engages` を「トリガ一致」の判定から「トリガ発火 + 値空間照合成功」の
判定へ書き換えた。中核は新設した `has_viable` — 継続なしの浅い `eval` probe
で Accept (前進あり) のみを viable と数え、Held (値空間照合失敗) はカウント
しない。Pending は mode 依存で、parse mode では argv 末尾の値スロット枯渇
(= missing operand) を意味するため viable に数えず、complete mode ではその
同じ Pending が補完候補として viable 扱いになる (仕様が complete mode の
先食い/早閉じ意味論に沈黙しているため、DR-097 適用前の挙動を維持する形)。

値スロットを持たない `CmdSat`/`DdSat`/`DdMatchSat` は `has_viable` を経由
させず、トリガ一致のみで常に成立する構造的判定のまま残した — `CmdSat` の
「値スロット」は子スコープ全体に相当し、それを評価すると排除したいはずの
下流失敗 (子スコープ内部の欠落・制約) を巻き込んでしまうため。それ以外の
形 (Seq のトリガ+値スロット、NativeMatch の long/short/eq-split、素の値
プリミティブ) は 1 回の浅い `eval` probe に還元される — `eval_seq` が
「トリガ、続いて値スロット」を単一ユニットとして評価するため、継続/CPS
機構なしでトリガ一致と値空間照合の両方を 1 パスで捉えられる。

早閉じ判定側には別途 `greedy_trigger_matches` / `any_trigger_matches` という
構造的トリガ一致だけを見るペアを残した — トリガは一致したが読みが不成立な
エントリが、より具体的な Held を既に `step_greedy` 経由で `out` に積んでいる
場合、早閉じ自体が生成する冗長な `element==""` の `unexpected_token` を裁定
側で除外するため (生成と裁定の層分離、DR-097 の明示原則の実装反映)。

DR-097 適用前提だった既存 wbtest 2 本 (MDR-002 §2.6 acceptance、REVIEW-D5)
は新述語の下で意図が逆転するため、期待値を新仕様 (読みゼロ→素通し) に更新
した。加えて述語の単体 pin として「flag は値スロットを持たないため常時成立」
「requires 未充足は先食い判定に不参加」の wbtest を新規追加した。

## 最終状態

spec main `24c72730` (DR-097 のコミット系譜自体は `8a04ea13` で完結、直後の
`24c72730` は無関係な gitignore 追加)。kuu.mbt は `deaab851` (実装) →
`6a68c8a2` (CI の spec fixtures pin bump `eb2efb73` → `24c72730`) まで進んで
いるが、`main` bookmark 自体はまだ `f586fa02` に留まり push 前 codex レビュー
中。just test: decoded=199 / ran_cases=530 / skipped=0 / mismatches=0、moon
test 306/306 pass (`deaab851` コミットメッセージに記載の実測)。

なお `docs/decisions/INDEX.md` の DR-097 概要行は `649130e1` (起案時点) の
まま更新されておらず、「先食い述語はトリガ一致でなく完全経路の存在を指す」
という初稿の定式化が要約として現役表示されている — `6eb705d0`/`8a04ea13`
で確定した「読み自身の成立」への訂正が INDEX.md に追随していない。DR-096
サイクル終盤に stop hook (codex gate) が検出したのと同種の「schema/index ↔
本文の双方向網羅漏れ」で、本サイクルでは追随漏れとして未修正のまま残って
いる。

## commit 系譜

spec: `649130e1` (DR-097 起案、+INDEX) → `7b8581a1` (DR-041 Superseded 追記)
→ `a37ebee1` (DESIGN §15.8 追記) → `46739922` (fixture
long-empty-prefix-typed.json 新設、3 例固定) → `05e14b89` (operand-collision
の why 追従) → `6eb705d0` (codex Major 3 件 + 実装実験 39 flip の反映、述語を
parse 相の「読み自身の成立」に確定、早閉じ側 fixture 新設) → `8a04ea13`
(語彙統一)。

kuu.mbt: `deaab851` (`greedy_engages`/`has_viable` 実装、早閉じ判定の生成/裁定
層分離、wbtest 更新) → `6a68c8a2` (CI の spec fixtures pin bump)。

## 関連

- DR-097 (`docs/decisions/DR-097-greedy-reading-viability.md`)
- DR-041 §4 (先食い・早閉じ抑制の原規定 — 本サイクルで Superseded 節を追加)
- DR-037 (Reject/Error 区別、解けた枝の数による結末分類 — 「他ルートが通る
  ならエラーは捨てる」の適用根拠)
- DR-038 (完全経路の一意性 — 「経路を黙って潰さない」契約)
- DR-047 §6-1 (制約評価のレイヤリング — 裁定層の一部として引用)
- DR-093 (required/requires の充足は型委譲・値源不問 — 判定を parse 相で
  閉じる根拠)
- DR-096 (scope config 軸別再編 — 同日の誤導出とその反省が本サイクルの起点)
- fixtures/matcher-readings/long-empty-prefix-typed.json (先食い側 3 例)
- fixtures/command-scope/early-close-viability.json (早閉じ側 3 例)
- 前回 journal: `2026-07-12-dr096-config-axis-reorganization.md`
