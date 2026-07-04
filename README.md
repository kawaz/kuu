# kuu

言語非依存な CLI 引数定義の仕様と conformance suite。

kuu の core は特定言語のバイナリではなく、**仕様 + API 契約 + conformance fixture (言語非依存のテストデータ集合)** である (spec-as-core)。各言語の kuu はこの core を実装するネイティブ実装であり、[kuu.mbt](https://github.com/kawaz/kuu.mbt) はその参照実装。

## 構成

| パス | 内容 |
|---|---|
| [ROADMAP.md](ROADMAP.md) | 全体構成方針と実装フェーズ |
| [docs/DESIGN.md](docs/DESIGN.md) | 現役仕様の単一ソース (AST・パース意味論・API 契約) |
| [docs/LOWERING.md](docs/LOWERING.md) | 糖衣展開 (lowering) のカノニカルカタログ |
| [docs/decisions/](docs/decisions/INDEX.md) | Design Records — 全設計判断の意図と不採用理由の記録 |
| docs/findings/ · docs/journal/ · docs/runbooks/ · docs/issue/ | 調査・経緯・手順・課題の記録 |

## DR 番号空間の注意

本リポの DR (3 桁、DR-001〜) は参照実装 [kuu.mbt](https://github.com/kawaz/kuu.mbt) 側の DR (4 桁) と**別系統**。相互参照時は `[external: kuu.mbt DR-NNNN]` 記法で系統を明示する。

## ステータス

垂直スライス実装 (kuu.mbt の slice 枝、167 テスト) との共設計を経て仕様はほぼ確定。conformance fixture の設計 ([ROADMAP](ROADMAP.md) フェーズ 1-2) が次の作業。全域で破壊的変更を許容する段階 ([DESIGN §0.1](docs/DESIGN.md))。

## License

[MIT](LICENSE) © Yoshiaki Kawazu
