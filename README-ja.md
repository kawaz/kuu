# kuu

言語非依存な CLI 引数定義の仕様と conformance suite。

kuu の core は特定言語のバイナリではなく、**仕様 + API 契約 + conformance fixture (言語非依存のテストデータ集合)** である (spec-as-core)。各言語の kuu はこの core を実装するネイティブ実装であり、[kuu.mbt](https://github.com/kawaz/kuu.mbt) はその参照実装。

## どのリポを見に来た?

- CLI を試したい → **[kuu-cli](https://github.com/kawaz/kuu-cli)**
- MoonBit プロジェクトに組み込みたい → **[kuu.mbt](https://github.com/kawaz/kuu.mbt)** (参照実装)
- 仕様を読みたい / 新しい実装を作りたい → **本リポ**

## 定義の見た目

CLI は JSON ドキュメント (*wire form*) として宣言し、conforming な実装はこれと argv を照合して同一の観測可能挙動を返す:

```json
{
  "options": [
    {"name": "port", "type": "number", "long": true, "short": "p", "env": "PORT", "default": 8080},
    {"name": "verbose", "type": "flag", "long": true}
  ],
  "commands": [
    {"type": "command", "name": "serve", "positionals": [{"name": "dir", "type": "string"}]}
  ]
}
```

long/short オプション、サブコマンド、位置引数、繰り返し、値源 (CLI / env / config / tty)、制約、alias、補完、help まで全て宣言的に定義し、全て conformance fixture で固定する。

`def.json` の冒頭に `"$schema": "https://raw.githubusercontent.com/kawaz/kuu/main/schema/wire.schema.json"` を書けば、JSON Schema 対応エディタ (VS Code 等) で補完と検証が効く。

## 30 秒で試す

本リポは仕様正本であり実行系ではない。最速の一巡は fixture を 1 個読んで schema lint を走らせること。

```sh
git clone https://github.com/kawaz/kuu
cd kuu

# descriptor registry を descriptor schema + 意味的不変量で検査
just lint-descriptors

# docs/REFERENCE.md が schema の語彙を過不足なく網羅しているかを検査
just lint-reference

# conformance fixture を 1 個読む (定義 + argv + 期待結果)
cat fixtures/absent/no-source-and-default.json
```

`fixtures/` の各 fixture は自己説明的: `definition` が wire form、`cases[].args` が argv、`cases[].expect` が全 conforming 実装が返すべき結果。この corpus を実装に食わせて動かすには [kuu.mbt](https://github.com/kawaz/kuu.mbt) を使う。

## 構成

外部向け (仕様・契約・corpus):

| パス | 内容 |
|---|---|
| [docs/VISION.md](docs/VISION.md) | kuu 全体構想 (レイヤ構造・kuu-cli・外周構想) — 何を目指すか |
| [docs/DESIGN.md](docs/DESIGN.md) | 現役仕様の単一ソース (AST・パース意味論・API 契約) |
| [docs/LOWERING.md](docs/LOWERING.md) | 糖衣展開 (lowering) のカノニカルカタログ |
| [docs/CONFORMANCE.md](docs/CONFORMANCE.md) | conformance fixture の形式と比較規則 |
| [docs/REFERENCE.md](docs/REFERENCE.md) | 定義を書く人向けの wire 語彙リファレンス |
| [ROADMAP.md](ROADMAP.md) | 全体構成方針と実装フェーズ — どの順で作るか |
| [fixtures/](fixtures/) | conformance fixture の corpus |
| [schema/](schema/) | wire form / descriptor の JSON Schema |
| [docs/decisions/](docs/decisions/INDEX.md) | Design Records — 全設計判断の意図と不採用理由の記録 |

内部運用 (maintainer 作業ファイル — 透明性のためリポ内に置くが、公開仕様面ではない):

| パス | 内容 |
|---|---|
| [docs/QUESTIONS.md](docs/QUESTIONS.md) | 現在の裁定待ちキュー |
| [docs/journal/](docs/journal/) | セッション作業ログ |
| [docs/findings/](docs/findings/) | 調査記録 |
| [docs/issue/](docs/issue/) | ローカル issue |
| [docs/runbooks/](docs/runbooks/) | 保守 runbook |

## DR 番号空間の注意

本リポの DR (3 桁、DR-001〜) は参照実装 [kuu.mbt](https://github.com/kawaz/kuu.mbt) 側の DR (4 桁) と**別系統**。相互参照時は `[external: kuu.mbt DR-NNNN]` 記法で系統を明示する。

## ステータス

垂直スライス実装 (kuu.mbt の slice 枝、167 テスト) との共設計を経て仕様はほぼ確定。conformance fixture の設計 ([ROADMAP](ROADMAP.md) フェーズ 1-2) が次の作業。全域で破壊的変更を許容する段階 ([DESIGN §0.1](docs/DESIGN.md))。

## License

[MIT](LICENSE) © Yoshiaki Kawazu
