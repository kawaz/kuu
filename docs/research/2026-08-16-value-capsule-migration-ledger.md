# 値カプセル移送台帳 — DR-139/140 の作業リスト (規範外)

> DR-139 (属性平面) / DR-140 (wire 射影) の裁定を全成果物へ反映する移送サイクルの台帳。
> **非正本・作業リスト** — 期待値の根拠は常に DR-139/140 と生存 DR 群。移送は lockstep 窓
> (spec fixture ↔ kuu.mbt) で行う。数値は 2026-08-16 実測 (fixture 450 ファイル時点、
> 構造走査スクリプトによる。移送実施時に再実測してから使うこと)。

## 1. fixture / corpus の機械変換

| 対象 | 実測 | 変換 | expect |
|---|---|---|---|
| `type` を持つノード | 1081 ノード / 445 ファイル | `"type": X` → `"value": "X"` (縮退形、他の値属性が無い場合) / `"value": {"type": X, ...}` (同居時) | 不変 (機械変換) |
| 座席 4 属性 (`piece_filters` / `value_filters` / `final_filters` / `accum_filters`) | 46 ノード / 41 ファイル | `pre_filters` / `post_filters` / `final_filters` / `collected_filters` として `value` 内へ | **不変が実測済み** (B' 報告 — 入れ子化のみの前提。リネーム込みで再確認) |
| `multiple` / `separator` | 98 ノード / 66 ファイル | 束ね名解体 → `value` 内の `separator` / `accumulator` / `collector` (+ `flatten` は accumulator の object 形へ) | **不変は未実測** — 移送時に実測してから主張する (fable M-3 の線) |
| `value:` (宣言定数) | 15 ノード | `"value": {"const": X}` | 不変 (機械変換 — bare JSON とカプセル object は型が重ならず一意) |
| definition-error 系 (wrong-seat / unknown-vocab の旧綴り fixture) | 座席系 fixture の一部 (41 ファイル中 definition-error 配下 21) | 期待 kind は不変だが、旧綴り自体が unknown-vocab 化するため **fixture の意図 (何を pin しているか) を 1 本ずつ読み直して書き換える** — 機械変換不可の要判断枠 | 個別判断 |
| corpus/ | 1 ファイル (座席使用) | 同上 | 不変 |

lint-fixtures は wire.schema.json 追随 (§3) の後でしか green にならない — **schema →
fixture → 参照実装の順で同一 lockstep 窓に入れる** (単独 push は CI を壊す)。

## 2. schema

- **wire.schema.json**: 要素直下から §廃止表 (DR-140 §3) の属性を削除、`value` を
  string | object 二形で追加 (object の properties = DR-139 の 14 field、accum 排他は
  if/then 補助)、グループ宣言 entry の判別条件を「value 不在」へ (DR-140 §4)
- **descriptor.schema.json**: 変更なし (value_type 体系は DR-126/137 のまま — wire の
  `value.type` は registry 識別子 string)
- **fixture.schema.json**: 変更なし (definition 部は wire.schema へ委譲済み)

## 3. docs

- **REFERENCE**: node-properties 表の全面書き換え (廃止 13 属性 → `value` 1 属性 +
  縮退形注記)、§3 type カタログの `multiple` プリセット言及の除去、§6 の座席名
- **DESIGN**: §3.5 (合成順 — DR-139 §4 へ参照付け替え)、§5.2 (`value:` → `const`)、
  §6 / §8.3-8.5 (座席名と配置)、§10 (ref 合成の適用範囲)
- **PIPELINE**: 段の名前 (座席 B/C/D1/D2 の綴り)
- **CONFORMANCE**: §2/§3 の座席名言及 (argv_pos 規約の綴り)
- **LOWERING**: multiple プリセット言及 (§A.5 count の accumulator 表現は DR-139 §1.3 の形へ)
- **DR 更新注記** (DR-139/140 の波及節どおり): DR-030 / DR-031 / DR-034 / DR-036 /
  DR-063 / DR-079 / DR-102 / DR-113 / DR-135 — 起草サイクルでヘッダ注記済みのもの以外を
  移送時に確認

## 4. kuu.mbt (lockstep、実装側 writer の領分)

- wire decode (廃止属性の除去・`value` 二形・const 吸収)
- `is_accum_elem` → cardinality 導出 (DR-139 §2.1、合成後平面での判定 = AP-Q5=b)
- multiple registry の削除、repeat installer の書き先変更 (DR-139 §5)
- グループ判別式・DR-135 分界の付け替え (DR-140 §4)
- lowered 断面の語彙追随 (DR-140 §5)

## 5. 新規 pin (移送と同時に足す観測点 — attribute-plane settlement ノート §6 の確定版)

1. cardinality 導出 4 トリガ (separator / accumulator / collector 単独、repeat のみ) の各々
2. `collected_filters` 単独宣言 (トリガなし) = invalid-range (導出の一方向性)
3. `final_filters` × 収集トリガの同時宣言 = invalid-range (両方向)
4. type プリセット (count) 由来の accumulator で accum 適格 (AP-Q5=b)
5. 合成: type プリセット chain への `{append: [...]}` 拡張 / ref + field 単位追記
6. ref 元 field の丸ごと上書き (累積しない)
7. wire 縮退形 `"value": "number"` = object 形と観測同値
8. const 吸収後の実体だけノード (source: const)
9. グループ宣言 entry の判別 (カプセル不在) — help fixture
10. 旧綴り (`type` 直下等) の unknown-vocab 化 (definition-error)

## 6. 残課題 (移送スコープ外・別裁定)

- lowered 断面の縮退形 (断面はフラット維持 — DR-140 §5 で確定済み、ここは作業のみ)
- `raw_filters` (座席 A) の配線は引き続き未配線・名前予約のまま (DR-079 §3 / DR-139 §1.2)
- issue `2026-08-16-fixture-reason-vocab-lint` (reason 語彙 lint) は独立
- issue `borrow-absent-target-not-checked` (borrow の absent 対象検査) は独立の裁定待ち
