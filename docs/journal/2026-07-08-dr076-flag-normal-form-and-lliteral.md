# DR-076 flag 展開正規形の確定と LLiteral (spec 外構文) の発見

kawaz との議論で DR-076 §2 の flag 展開正規形を確定し、その過程で spec に存在しない
構文 (colon 無し literal 綴り) が fixture と kuu.mbt に入り込んでいたことを発見・裁定した記録。

## 裁定の流れ (時系列)

1. **count の分離**: DR-076 TODO の「flag/count → bool の展開」は初稿の粗さ。count の展開先は
   number セル (DR-005: number + defaultValue=0 + increment、accumulator はセル側 = DR-029) で
   bool ではない。TODO を分割 (commit 34231bd7)
2. **正規形 = long 綴り合成** (旧案 B)。旧案 A (matcher 無しセル + Exact + link の node 語彙) は
   bool lowering の node 層重複記述になるため不採用
3. **flag 廃止案の検討と棄却**: 「bool + `long:[":set:true"]` で古典 flag が書けるなら flag 不要では」
   → long 軸では成立するが **short 軸の裸発火 (`-v`) の表現手段が消える** (short は variant DSL を
   持たない = DR-071 §3、非消費の慣習挙動は型が担っている = DR-071 §2)。flag を残す実質的理由は short
4. **糖衣差し替え**: flag の `long:true` 糖衣 = `[":set:true"]` (裸のみ = 古典 flag)。他の型の
   `[":set"]` (DR-071 §1) を preset が差し替える — count が defaultValue=0 を差すのと同型で、
   `:set` の代数 (DR-076 §4、型非依存) には触れない
5. **合成規則**: 非空 variant リストへ `:set:true` を補完 (冪等)。absent/false/[] = 入口なし
   (DR-071 §1 三態同義維持 — 区別に載せると protobuf3 等の wire で意味が変わる)
6. 着地: DR-076 §2 全面改訂 + DR-071 §1 相互参照 + LOWERING §A.5 書き直し (commit 772f0f51, eaa04d50)

## LLiteral の発見 (spec に無い創作構文)

- fixture (`fixtures/command-scope/shadowing*.json` 等 ~10 定義) に `long:["verbose"]` という
  colon 無し文字列があり、kawaz が「初めて見た」と指摘 → 精査
- **DR-011 の文法は colon 必須** (`"set"` 単独すら文法エラーと明記)。colon 無し形はどの DR にも無い
- kuu.mbt の `classify_long_spelling` (src/core/installer.mbt) が独自に **LLiteral = literal 綴り**
  として解釈していた。さらに語彙外 effect の typo も literal に fallback (黙って「マッチしない入口」化)
- **裁定**: colon 無し・語彙外 effect は definition-error `unknown-vocab` (DR-054)。literal 解釈も
  typo fallback も不採用。実体名と異なる綴りの入口は **DR-057 alias 独立要素**が正
  (canonical 側リスト不採用と同根 — 綴り関心を long 配列へ二重表現しない)。DR-011 に明確化注記
  (commit 8730d61c)

## ハマり所 → 解決

- **「prefix-only variant は値形になるはず」という私 (team-lead) の初期解釈は誤り** — DR-011 の
  文法を精読すれば colon 無しは文法エラー。spec に無い形を fixture が使っていたら「どう解釈すべきか」
  ではなく「そもそも合法か」を先に確認する
- worker (dr066-path) の実装で **fixpoint 非収束バグ 2 件**を発見: `triggers_overlap` が variants を
  見ていない + long/variants クロス格納の衝突見落とし。flag 主入口が long から variants
  (`:set:true`) へ移ったことで顕在化した既存の潜在バグ
- **decode 層で糖衣を潰すと二形情報が消える**: `long:true` と `long:[":set"]` は decode 後に
  区別不能になり、flag の糖衣差し替えが installer 層で書けない。DR-071 §1 の「展開は long installer
  の解釈」に従い、ElemDef が二形を保持する表現へリファクタ (進行中)

## 着地 (同日完結)

- kuu.mbt: flag 展開 + LongDecl 二形保持 + LLiteral 廃止 (856afa94)、copy_global_into 冪等バグ修正
  (2e74bd21)、pin bump (18328fe4) — 全 push・CI green
- spec: fixture 移行 10 ファイル (8f4e1373、期待値は全ケース不変・定義の wire 形と why のみ変更)
- conformance は decoded=115 / ran_cases=287 / skipped=0 / mismatches=0 に完全復帰

## codex 節目レビューと 3 件の追修正 (c8fd82e5)

節目レビュー (read-only) の指摘 4 件: 2 件は既知 (起票済み) の裏書き、2 件が新規実欠陥。
3 件を RED 再現 → GREEN で修正:

1. **alias long_override の二形保持漏れ (High)** — `AliasDef.long_override` を LongDecl 化し、
   desugar_aliases が **pre-normalize 複製 (orig) から canonical の元の型 (TFlag) を引いて**
   resolve_long を alias 側にも適用 (normalize 後は TBool 化済みで flag 起源が判別不能、が根本原因)。
   issue dec-alias-long-override-flag-sugar-gap を close
2. **copy_global_into の冪等判定 (High)** — 同名・別トリガの独立 global が先行 copy に誤抑止される。
   判定を「同名 + コピー由来 + トリガ集合一致」に強化。**parse() 経由のテストでは DR-041 §4 の
   早閉じ + porous が観測結果を偶然保存して偽陰性**になり、materialize 後の Rooted 衛星数の
   直接検査で初めて再現した — global/inheritable 系の検証は構造直接検査まで下りること (教訓)
3. **add_inheritable_copy の shadow 判定 (Medium)** — long_of のみ参照で variants 側トリガを
   見落とし重複 copy。all_long_triggers へ (クロス格納バグと同族の残り)

最終状態: 108 tests 全 green / conformance 287 cases 0 mismatch / 両リポ push・CI green。
残 issue: global-mid-shadow-repropagation-fixture-lost (輪郭 fixture 再設計、shadowing.json も対象)。

- 関連 DR: DR-076 / DR-071 / DR-011 / DR-057 / DR-054 / DR-005 / DR-029 / DR-041 §4 / DR-042 / DR-059
