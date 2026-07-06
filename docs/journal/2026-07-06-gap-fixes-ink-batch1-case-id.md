# gap 修正 / spec-gaps 第 1 バッチ ink / fixture case-id 導入

## slice gap 修正 (slice commit 7621235c / 333cbf7b / deb8d0f6)

- shadow subtree: 真因は link 束の逃がし先が絶対 root 固定 (Bool)。「宣言 scope までの escape 段数」(Int link_depth) へ一般化
- empty fired scope ×2: slice 本体は当初から仕様準拠、runner 側 resolve_tree で解消済みだった (修正不要と確認)
- transparent-kv: SCALAR 昇格が kv 文脈でも発火 (DR-052 §2 違反)、文脈判定を追加
- min2 held-error + complete-path-count: 枯渇 held の emit 漏れ 2 経路 (consume_head / scope_consume の NumArg・SepArg) + optional 継続枝の leak 対策
- codex stop-gate が FilterArg の漏れを追加検出 → 2 経路修正 + 輪郭テスト追加 (202 tests へ)
- 台帳 10→6 (残 = collision / or 枝 id ×2 / ambiguous-receptacles ×3、全て裁定待ち)。issue 2 件 close (min2 / structural-failure)、latent 2 件起票 (transparent 昇格の兄弟なし穴 / IdxRepeat の Held 握り潰し)

## 台帳強化 + deprecated 調査 (slice commit 966578b4 / a6b22f1a / 068ac961)

- codex Major finding: decode/skip 状態が凍結されていない → expected_skips() 新設、UNEXPECTED SKIP / VANISHED SKIP / CHANGED SKIP REASON の 3 方向 fail
- verdict 全文粒度の凍結へ強化 (凍結 case 内の第 2 退行が隠れられない)。レビューが変異注入で両方向発火を実測確認
- Show→Debug 移行は不可能と実機確定: inspect は builtin で Show 必須、derive(Debug) は to_repr→Repr の別機構 (マイクロ probe で実証)。真の移行は 372 inspect の書換で upstream 待ちが最小コスト。Show 系実数 77 警告 (245 は総計)
- moon fmt ドリフト解消 (a6b22f1a)。abort 文言が moon test に握り潰される問題に println 対策

## spec-gaps 第 1 バッチ ink 反映 (spec commit 92eaa7aa〜06ed604e / 9925d8f3 / 77cdeaf8)

- kawaz ink: #10 separator 一本化 / #9 bare separator 非 gap / #2 interpretations 集合比較 / #8 warnings 語彙化 / #6 inheritable Model Y
- 反映先: DESIGN §6.3、CONFORMANCE §2/§3、DR-053 §3、DR-059 §5、fixture 5 本のヘッジ除去 (golden 全数不変)
- must_fix 1 件: 分析骨子に紛れた「accumulator 省略時 append 既定」が DR-036 にも wire schema にも根拠なし → 撤回 (canonical form は accumulator 明示)。仕様の捏造を避ける裁定
- follow-up 起票: slice reader の separator whitelist 掃除 (slice issue)

## fixture case-id 導入 (kawaz 提案 → DR-072)

- 動機: rel::case#N は配列位置依存で case 挿入・削除により台帳・issue・DR の参照が壊れる
- DR-072: kebab-case slug (2〜4 語、通し番号禁止) を cases[].id として必須化。一意性検査は DR-067 の wire 3 層と disjoint な fixture メタ層 lint
- 導入順序が重要だった: slice が id 受理 (aa819cba) → spec 付番 (86 fixture / 223 case、3 分担、golden 1 バイト不変を機械確認) → slice 台帳 slug 化 + id 必須化 (bf7d5bf5)
- must_fix 1 件: DR-072 が lowering fixture (単一 expect 形式) まで id 対象と誤規定 → lower は rel 参照が元々位置非依存なので対象外と DR 訂正 (f216b772)
- suggestions 5 件適用 (282fdf35): is_kebab 厳密化 (^[a-z0-9]+(-[a-z0-9]+)*$) / skip fixture も raw JSON 段で id 検査 (decode 可否と直交) / slice 内位置依存参照 2 箇所の slug 化 / 診断文言 / case tripwire
- 台帳新表記例: path-search/ambiguous-receptacles::zero-tokens-unique-split

## 運用の学び

- レビュー tier の使い分け: kawaz 指摘「チェックレベルのレビューに Fable はオーバースペック」→ claude-rules-personal の top-tier-model-delegation に「レビューの tier 判定」節を追加 (機械確認主体は中位 tier、workflow レビュー段の惰性一律最上位はアンチパターン)
- gh-monitor plugin bug 2 件観測・起票: workflow 不在チェックが git bare + jj workspace 構成で素通り / workdir 解決がセッション起動 dir を拾う疑い。「幻の SHA」と誤認した件は検証コマンドの cwd ミスで、訂正済み (SHA は並行 workflow agent の実在 commit)
- local-issue plugin の INDEX ソート bug 起票 + 3 リポの INDEX 手是正

## 現在の HEAD (push 済み)

- kawaz/kuu main = 387d18eb
- kuu.mbt slice = 1f65e5d9 (202 tests green、decoded 103/104、divergence 6 凍結)
