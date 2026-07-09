# DR-077/DR-078 と harness 統合ギャップ潰しの一日

2026-07-09 の記録。前日 (DR-076 flag 正規形) の続きで、effect 語彙の拡張 (count)、
filters registry 基盤、conformance harness の統合ギャップ 3 連、definitions.templates
新設までを一気に着地させた。

## 裁定と DR (kawaz × Claude の議論から)

- **DR-077**: 「消費時 hook はどこにあるか」の問いから effect (DR-045) の座席を再確認 →
  inc 固定語案 / set reducer 化案 / parser (val,old)=>T 案の 3 案を比較して
  「効果 op に `update` 1 語 + transform は filters registry の T=>T 名前参照」で確定。
  count = number + default:0 + `long:true` 糖衣 `[":update:increment"]` (flag と対称の綴り合成 2 例目)。
  組み込み transform 名は inc → increment (registry 語彙は非省略が慣例、kawaz 指摘)。
  update の old は **CLI 席内の畳み** (ラダーは選択であって合成ではない — `VERBOSITY=5` + 1 発火 = 1)
- **DR-078**: ref-or-template fixture 化のブロッカー (共有消費文法の wire 置き場が無い) から、
  definitions.templates 区分を新設 (types = クロージャ持ちパーサ / templates = クロージャなし構造、
  の役割分担)。あわせて **ref の参照実体は内部 id** (name は lookup キー) の精密化 (DR-032 更新)。
  DR-032 は元々「definitions テンプレ」に言及しており、DR-035 の区分限定で座席が消えていた
- **docs/PIPELINE.md 新設**: 値パイプライン (filters/effects/registry) の説明用集約 (derived 宣言付き、
  artifact からの Markdown 化)

## 実装 (kuu.mbt、全て RED→GREEN + CI green)

- DR-077: EffectOp::Update + TCount の遅延変換 (short が count/number を区別する必要から
  flag と非対称に ensure_entity まで遅延) + **resolve_entity の cli seat を argv 順 fold に一般化**
  (update は old 依存。非 update op では last-wins と厳密等価 = DR-015 の保証は fold の特殊ケース)
- filters registry 基盤: FilterDescriptor (signature Validate/Transform) + trim/non_empty/in_range/increment +
  update 結果への post_filters (DR-040 の「count 上限は in_range」がついに実体化)
- collector 配線 (DR-036): decode → build_result 実適用まで。to_set/from_entries は false promise
  回避で明示 DecodeSkip
- DR-078 decode: definitions.templates + ref (ランタイムは既存 ref_target 経路が無傷で生きた)

## harness 統合ギャップ 3 連 (このセッションの主発見)

conformance harness (json_conformance_wbtest.mbt) の判定本体 run_case に、実装層のテストでは
見えない穴が連続で見つかった:

1. **failure 分岐が resolve 層を呼ばない**: parse 成功 + resolve 失敗 (post_filters reject) の
   ケースが誤 ok 判定。-vv (success 期待) と -vvv (failure 期待) で挙動が割れた真因は
   fire 数でなく**期待 outcome による分岐非対称**。do_resolve_pe 新設で修正
2. **post_filters reject の kind/argv_pos 未配線**: ladder_err (KParse) ハードコード + at_pos=-1。
   filter_err (KFilter) 分離 + final position 配線で修正 (resolve 層エラーは完了後位置 = constraint と同規約)
3. **ref / templates / collector の decode 欠落**: ランタイム実装済みなのに wire 経路が塞がっていた
   3 兄弟。「decode は通るがランタイムが黙って無視する」false promise を作らない方針で個別に判断

**教訓**: 「fixture harness の実経路で確認済み」という報告が decode 層 + resolve 直接呼び出しの
検証で、判定本体 (run_case) を通していなかった (worker が誠実に自認)。**検証の主張は
「どの関数を通したか」まで特定して書く**。また実装者の主張を fixture 作成者が別経路で検算する
クロスチェックがこの 3 連の検出装置として機能した。

## 蒸留 1:1 audit の決着状況

漏れ 8 件のうち本日 5 件解消 (#1/#2 ref-or-template、#3 unwrap_single、#7 kind:filter、
それぞれ fixture 済み)。残 3 件は issue 追跡: #6 constraint path filter (DR-047 未実装、大型) /
#8 tried_triggers (CONFORMANCE 拡張) / ref テンプレ内要素の結果ビュー形 (新発見、
issue ref-template-result-shape — slice の元 pin は bindings 面までで輪郭は失っていない)。

## 数値推移

conformance: 123 fixture / 325 case (朝) → **132 fixture / 344 case / mismatch 0** (夜)。
kuu.mbt テスト 114 → 143 本。ワーカー 3 名 (dr066-path / fixture-batch は weekly limit で
途中交代 → impl-worker2 / fixture-batch2) + team-lead 直の混成。

## 残 issue (次セッション候補)

- kuu.mbt: constraint-path-filtering-gap (DR-047 path filter、大型) / pre-split-filters-execution-wiring /
  accum-entity-filters-wiring
- spec: ref-template-result-shape (kawaz 議論球) / ref-elemdef-inheritance-semantics (idea) /
  conformance-tried-triggers-help-entry-fields / negatable-sugar-b3-ruling (idea) /
  inf-json-serialize-convention / schema-materialization / distill-1to1 (残 = blocked 分の追跡のみ) /
  corpus 系 4 本 + dd-required + is-tty (議論球)
