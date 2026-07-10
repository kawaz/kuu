# DR-082: definition_error fixture format — DR-054 §4 返値の転用

> 由来: DR-065 §1 が query タグ `"definition_error"` を予約のみ (expect 構造は「後続で確定」) としていた座席の確定。accum×update の静的 definition-error 裁定 (issue accum-fold-update-default-ops、2026-07-10) を fixture 化する必要が生じて顕在化 (issue definition-error-fixture-format)。kawaz 承認 2026-07-10。

## 決定

### 1. expect は DR-054 §4 の parse_definition() 返値をそのまま転用する

```json
{
  "query": "definition_error",
  "definition": { ... },
  "cases": [
    {"id": "...", "why": "...",
     "expect": {"outcome": "definition-error",
                "errors": [{"element": "tags", "kind": "invalid-range"}]}}
  ]
}
```

- fixture 専用の簡略形は作らない (DR-065 §2 と同じ原則)。definition-error fixture に argv は不要 (定義の静的検査であり実行しない) — cases の `argv` は省略
- **比較は element + kind の組の集合比較**。`message` / `hint` はレンダラ管轄の文言なので fixture に書かず比較もしない (parse fixture の errors が message を比較しないのと同流儀、CONFORMANCE §2)
- kind の語彙は DR-054 §4 の列挙 (vocab-intersection / unknown-vocab / invalid-range / absent-ref / circular-ref / zero-progress / config-cycle) をそのまま使う

### 2. 「未対応構成」系の kind は invalid-range

accum (multiple 宣言) 要素への `:update:<T=>T transform>` variant 宣言、count×multiple、option ref repeat の min>1 など「構文上は書けるが構成として不成立」の静的 reject は **kind=invalid-range** に落とす。「宣言された構成が受理可能な値域の外」という値域系の読みで、kuu.mbt の DInvalidRange 実装前例 (min>max / min>1 / accum×update) とも一致する。unknown-vocab は「語彙自体が未知」(transform 名が registry に無い等) に取っておく。

## 波及

- DR-065 §1 の予約解消 (query タグ 4 種のうち definition_error が確定。complete のみ未確定で残る)
- DR-069 の definition-error プロファイルが fixture で検証可能になる
- fixture 新設: accum×update / count×multiple / option ref repeat min>1 (kuu.mbt の wbtest pin からの昇格)
- kuu.mbt: harness が query=definition_error を decode し parse_definition の DefError 列と突き合わせる経路の追加

## 関連

- DR-054 §4 (parse_definition 返値と kind 列挙) / DR-065 (fixture format と query タグ予約) / DR-069 (準拠プロファイル)
- DR-077 §2 (transform の静的検査 — accum×update reject の導出元)
- issue definition-error-fixture-format (経緯)
