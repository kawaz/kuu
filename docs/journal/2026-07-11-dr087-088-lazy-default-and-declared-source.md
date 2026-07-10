# DR-087 (default の遅延解決) から DR-088 (経路探索の値充足述語) までのサイクル

bool-requires の config/inherit 対応中に浮上した「default 解決タイミング」の混乱を kawaz 裁定で
DR-087 に固定するところから始まり、resolve フェーズ棚卸し audit、制約検査の読者化 (Phase 1)、
全 deferred 化を試みて regression を実機検出、経路探索の値充足述語を DR-088 として再定式化
するまでを通したサイクルの記録。

## DR-087 (default の遅延解決)

bool-requires の config/inherit 対応作業中、「config_file 解決の再演が要るのでは」という混乱が
生じた。kawaz が裁定: **default は全解決後に空の cell へ入る fallback であって、先詰めは本義で
ない — placeholder を設置し、依存順に最終実体化する**。default_fns の評価タイミングもこの実体化
まで遅延させる (補足裁定)。

commit: spec `ffbfc066` (DR-087) → `e82f0288` (default_fns 追記)。

## DR-087 棚卸し audit

DR-087 の前提整理として resolve フェーズ全体を棚卸しした。結論: 「先詰め + 上書き」アンチ
パターンは無い (ラダーは短絡遅延形)。一方で本命 finding が出た — **制約検査 (bool-requires)
が resolve より前に自前のミニラダーで値源を再解決している**構造。この重複は issue
`resolve-first-constraint-pipeline` へ切り出した。

findings: `2026-07-10-dr087-resolve-phase-audit.md` (kuu.mbt リポ)。

## Phase 1 (制約検査の読者化)

`resolve_scope_tree` を pub 昇格して provider 契約とし、制約検査専用のミニラダー・
`config_obj` 単一注入・`collect_all_scopes` を廃止した。制約検査は resolve 済みの provider を
読むだけの読者になり、値源の再解決という重複作業自体が消えた。

副産物として、audit で理論的ギャップとして指摘していた CfgFiles×bool-requires (複数 config
ファイルの重ね合わせが bool-requires に届かない問題) が provider 一般化だけで自然に解消した。
fixture 2 case で実証した。

commit: kuu.mbt `ef976bcd` (bool-requires) → `0f51f64b` (Phase 1)。

## value-present-ladder-gap → 選好オラクル衝突 → DR-088

Phase 1 の勢いで CRequires を全 deferred 化 (= 値充足判定を実解決後まで遅らせる) しようと
試みたところ、worker が repeat の取り分選好 (REVIEW-D1) から制約が消えて stop 候補が生成
されなくなる regression を実機検出し、独断で進めず停止報告した。全 deferred 化は経路探索の
枝刈りに使っていた「宣言があれば満たされる見込み」という早期シグナルを失わせていた。

kawaz 裁定: 「env 指定があるということは env から遅延解決する default_fn が設定されてるような
もの。つまりデフォルトはある」。この整理から **DR-088** を定式化した:

- 経路探索の値充足述語は**静的宣言ベース** (`committed ∨ default/default_fn/env/config/inherit
  の宣言有無`)
- 確定判定は**遅延解決後の実値** (空なら unset のまま落ちる、再探索はしない)

候補ごとに実解決を注入する案 (= 経路探索の各分岐で実際に値を解決してから充足判定する) は、
経路選択そのものが実行時の env 依存になってしまう (同じ定義が env の有無で異なる経路を選ぶ
可能性が生じる) ため不採用とした。DR-087 の「遅延解決」原則と、経路探索の枝刈りに要る「静的な
見込み判定」を分離して両立させる決着になった。

commit: spec `523ab6d7` (DR-088)、kuu.mbt `69e9d690` (DR-088 実装)。

## 旧挙動 pin の更新

`requires-bool-target-contrast` の `c-env-set-still-fails` case を `c-env-set-satisfies-requires`
へ改名・挙動更新した (DR-088 により env 宣言がある場合は充足見込みとして扱われるため、旧来の
「env があっても requires は満たされない」という pin は誤りになった)。同型のインライン wbtest
も追従。

commit: spec `836db615` (contrast 更新)。

## 数値

conformance: decoded=179 / ran_cases=466 / skipped=0 / mismatches=0。moon test 217 本。全 CI
green。

## 関連

- DR-087 (`docs/decisions/DR-087-lazy-default-resolution.md`、default の遅延解決) / DR-088
  (`docs/decisions/DR-088-static-declaration-satisfiability.md`、経路探索の値充足述語)
- issue `resolve-first-constraint-pipeline` (DR-087 audit の切り出し元、Phase 1 で対処)
- findings `2026-07-10-dr087-resolve-phase-audit.md` (kuu.mbt リポ、本サイクルの前提調査)
- 前回 journal: `2026-07-10-dr086-values-decode-regex-cycle.md`
- spec commit: `ffbfc066` → `e82f0288` → `523ab6d7` → `836db615`
- kuu.mbt commit: `ef976bcd` → `0f51f64b` → `69e9d690`
