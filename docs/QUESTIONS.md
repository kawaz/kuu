# 裁定・確認待ち一覧 (ユーザ用)

## 運用規約

<details>
<summary>ゼロコンテキストエージェント向け（本セクションは消さない）</summary>

- 裁定/確認待ち項目を 1項目=1ラベル=1セクション で記載
- ラベル形式: XX-Q1（XXは2-3文字程度、バッチやセッション内で一意な短プレフィクス、Qn単独の使い回し禁止、長期一意性は不要)
- 依頼形式: 「👺XX-Q1 の裁定お願いします」（参照用途ではラベルに👺を付けない。誤陽性がユーザのハイライト/アラームを汚す）
- チャット提示と同一ターンで本ファイルに記録 + path 指定 commit (push はリリース窓に同乗)
- 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue / journal / close_reason) へ反映。本ファイルは常に「現在待ち」だけを持つ
- 参照は[]()で提示（リポ内は相対、リポ外はフルパス）
- 初版質問/依頼は長文で書かない（ユーザが説明を求めらたら本ファイルに説明を追加し、チャットで👺ラベルで再依頼）
- **選択肢・確認項目は `- [ ] a: …` 形式（チェックボックス + ラベル）で書く**。
  Q / C で記法を分けない。回答は「チェックを付ける」でも「XX-Q1a」と言葉で返すでも通る
  （複数まとめてチェックし「チェックしたよ」の一言で済ませる運用を想定）

</details>

> 🔍 **fixture UI**: [kuu-fixtures.kawaz-mbp16-20211217.kawaz.jp](https://kuu-fixtures.kawaz-mbp16-20211217.kawaz.jp) (tailnet 内限定 / ローカルは [localhost:5757](http://localhost:5757)、`just fixture-ui` で起動)

## 裁定待ち

### CNV-Q1: command node の `value` 属性は合法か

issue 棚卸し (2026-08-03) で浮上。schema の node 共通属性と DESIGN は `value` を全 node 位置で合法としているが、実装の CommandDef は carrier を持たず decoder が reject する。DR-120 (command = 結果スコープ) / DR-130 (未選択 command = 親キー null) の下で「command 自身が値を持つ」意味論は定義されていない。

> kawaz 裁定方向 (mid=60): b — command が値を持つのは help/version 等でよく見る形。スコープ生成は
> command 特有でなく (named or も作る)、スコープ = 値が map というだけ。親から見ればどちらも
> フィールド名 + JSON 値であり拒否理由が無い。統括も (a) 推しを撤回し同意。

- [ ] CNV-Q1b 確定待ちの残設計点: **value 持ち command と結果キー占有子の共存規則** — 統括推し:
  「command は値かスコープのどちらかを名乗る」= value 持ち command に結果キー占有子は definition-error
  (非占有子は共存可)。未選択時は従来どおり null で一様。value 供給は既存 node 意味論 (value:/default/fn) のまま。
  異議なければこの形で DR 起草へ

### CFM-Q2: 複数 config_file の後勝ち粒度 — 全体置換 (DR-133 現形) の確認

CFM-Q1a 反映の実測で下位軸が顕在化。起草済み [DR-133](decisions/DR-133-multi-config-file-last-wins.md) は
**(a) オブジェクト全体置換** を規範化した (参照実装の現挙動): 勝った 1 ファイルだけが config 席を埋め、
負けたファイルにしか無いキーは供給されず要素は自前 default に落ちる。

導出は堅い — DR-050 §2 の provider 契約 (1 パス → 1 オブジェクト、**マージ戦略は provider の関心**) と
DR-031 (config 席は 1 つ) の帰結で、core がキー単位で重ねるとこの分界を侵す。

ただし一点緊張がある: DR-133 §1 は複数宣言の動機に「システム設定 + ユーザ設定」を挙げるが、(a) では
この**重ね**ユースケースは実現できない (ユーザ設定に無いキーがシステム設定から採られない)。git config /
shell rc 等の慣習はキー単位重ねなので、素朴な期待とずれる可能性。(a) の下で複数要素の実用途は
「排他的なファイル選択」に絞られ、重ねたい利用者は 1 要素 + 複数ファイル探索 provider で書く。

kawaz c 案 (mid=1-2、2026-08-12) で方向確定しつつある: **単体要素間 = 全体置換 (DR-133 現形維持) +
multiple config_file = 要素内のパス列をトップレベルキー置換限定で fold** (重ねの明示宣言は既存 multiple
語彙で表現、深いマージ需要は将来の別タイプ or provider へ)。統括も条件付き賛成済み (チャット)。

残る詰め (統括提示、異議なければこの導出で改稿):

- [ ] CFM-Q2-α: fold の精密形 — 採用された各パスを宣言順に provider へ渡し (1 パス 1 オブジェクト契約
  不変)、結果をトップキー置換で畳む。committed Error / default 不在黙認は各パス独立で判定
- [ ] CFM-Q2-β: DR-050 §2 の分界の書き直し — 「マージ戦略は provider の関心」を「1 パス指定から provider が
  探索・合成する類」に限定し直し、multiple の複数パス明示は core の fold 対象とする追記
- [ ] CFM-Q2-γ: v1 はダイヤル無し — トップキー置換固定 (「デフォルト」の将来ダイヤル語彙は v1 に持たない)

> 改稿範囲: DR-133 追記 (multiple fold 節 + 動機記述を multiple 誘導へ) + DR-050 §2 note + fixture 追加
> (multiple config_file の fold / committed 独立判定)。裁定まで DR-133 系 commit の push は保留。

### CMP-Q1: option / command の面越し同名と補完 identity の突き合わせ規則

DR-116 実装レビュー (2026-08-12、fable5-high) で顕在化した spec 未規定領域。candidate の `origin`
(DR-104) は「どの面 (option / command / positional) の名前か」を修飾しない裸の String で、DR-117 §5 の
「options / commands entry の name に突き合わせる」も面越し衝突を未規定のまま残している。同一スコープに
option `build` と command `build` が併存する定義は現行 wire decode で受理される見込みで、その場合
command 候補が option entry の説明・順序席に誤接続する。named alias 名が他要素名と衝突する場合も同型。

- [ ] CMP-Q1a: **面越し同名を definition-error にする (統括推し)** — 補完 identity・help entry・
  export_key いずれの面でも「同名の別物」は利用者にも紛らわしく、禁止の見返りが大きい。既存の
  同型裁定 (export-key/collision 系 fixture の definition-error) と整合
- [ ] CMP-Q1b: 合法のまま突き合わせ規則を規定 (origin を面修飾付きにする等、candidate wire の変更が波及)
- [ ] CMP-Q1c: その他

### CMP-Q2: DR-117 §5 へ「prefix 絞りは挿入文字列を持つ候補への操作」の note 追記確認

同レビューの M2。値位置 marker (spelling 空、`:shell_action` へ翻訳される候補) が §5 の列挙順の字面
どおりだと prefix 絞りで落ち、一文字打つとファイル補完が全滅する。実装は marker を prefix 絞り対象外へ
修正中 (DR-060 §4 の shell 委譲意図から導出)。spec 側にも DR-117 §5 へ一行 note (「prefix 絞りは挿入
文字列を持つ候補への操作であり、値位置 marker は対象外」) を追記したい。

- [ ] CMP-Q2a: **note 追記して確定 (統括推し)** — DR-060 §4 との整合を明文化、実装との齟齬芽を摘む
- [ ] CMP-Q2b: 異議あり (prefix 絞りが marker にも及ぶべき等)

## 確認待ち

(現在なし)
