# real-cli コーパス (非正本・実験用)

実在するメジャーコマンドの引数定義を kuu の定義形式 (fixture フォーマット) で書き集めた
**表現力検証コーパス**。目的は 2 つ:

1. **仕様の表現力の実地検証** — 実世界の CLI を kuu で書けるか、どこで歪むか / 詰まるかを炙り出す
2. **将来の conformance fixture の実世界供給源** — 表現力・期待値が枯れたケースは `fixtures/` へ昇格する

## 位置づけ: 非正本

- **conformance の実食対象外**: このディレクトリは `docs/CONFORMANCE.md` の runner が読む正本 fixture
  (`fixtures/`) ではない。実装のパス/フェイル判定には使わない
- **昇格前の実験段階**: 期待値は「当該コマンドの実際の挙動 (man / --help / 実機観測)」に照らして書くが、
  仕様の解釈が揺れうる箇所を含む。表現できないケースは `docs/issue/` に起票する
- **fixture フォーマットは DR-065 準拠**: ファイル構造 (`why` / `query` / `definition` / `cases` /
  `expect`) は `docs/CONFORMANCE.md` と同一。昇格時にそのまま `fixtures/` へ移せる形で書く

## 昇格フロー

1. real-cli/ でコマンドを定義し、典型呼び出しを case 化する
2. 表現力・期待値が枯れた (仕様解釈が確定した) ケースを見極める
3. 対応する機能領域の `fixtures/<領域>/` へ case を移設 (または新 fixture 化)
4. real-cli 側には「昇格済み: fixtures/<領域>/<file>」の相互参照を残すか、重複を削る

## ファイル構成

`<tool>.json` — 1 コマンド 1 ファイル。ファイル冒頭の `why` に「この定義がプローブしている仕様機能」
を書く (例: `dd.json` = key=value 独自形式が matcher で表現できるかのプローブ)。case の `why` には
「そのコマンドの典型的な呼び出し方」と「なぜこの期待値か (実機観測の根拠)」を書く。

## 実機観測の前提

期待値は 2026-07-07 時点の macOS (Darwin 25.5.0、BSD 系 coreutils) の man / 実機挙動に照らす。
GNU coreutils とオプション体系が異なるコマンド (grep / find / sort 等) は **BSD 系**を基準にする
(ファイル冒頭 why に明記)。GNU 固有オプションは対象外か、別ファイルで扱う。

## 関連

- `docs/CONFORMANCE.md` — fixture フォーマットの正本
- `docs/DESIGN.md` — UsefulAST の宣言層語彙
- `docs/decisions/DR-065-*.md` — fixture フォーマットの判断記録
