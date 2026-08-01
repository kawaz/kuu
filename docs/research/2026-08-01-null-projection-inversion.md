# null 反転 — absent (キー無し) を null に反転する結果射影の大転換

> 由来: kawaz 提案 2026-08-01 (ccmsg r98 mid=30〜40)、裁定は NUL-Q1〜Q4 / NUL-C1 checkbox
> (2026-08-01 全確定)。発端は LNK2-Q1 (nameless tuple の部分書きで配列の穴が表現できない) の再考 —
> 「逆に undefined を null に寄せるのはどうだろう」(mid=30)。DR-051 (absent 意味論) を全面 supersede
> する転換の正本。規模実測は影響調査 (2026-08-01、本ノート §4 に要約) 済み。

## 1. 中核規範 (チャット裁定で確定した骨格)

1. **成功 result の各実現スコープでは、宣言上出うる全キーが必ず現れる。埋まっていなければ null**。
   undefined (キー無し) は成功 result から消える — 意味論の反転 (mid=30)
2. **未選択の子 command scope は親レベルに `subcmd: null` と出るだけ** — null がサブツリー展開ごと
   置き換えるので再帰は 1 段で止まる (mid=31)。選択された scope の内側は再帰的に全キー列挙 + null
3. **null は「この文脈に存在するが値が無い (未 commit)」、動的キー構造だけが present のみ** —
   静的/動的の境界は NUL-Q3 (§2)
4. **null は値空間の住人に昇格する** (射影層限定ではない)。パイプラインは **null 素通し規則 1 本**
   (filter / parser は null に触れず素通し — Option monad 的)。全域 nullable 分岐は発生させない
5. **配列の穴が表現可能になる**: nameless tuple の部分書きは `[null, 2]` — LNK2-Q1=a (全座まで absent)
   は本転換で obsolete (全座成立判定ロジックは実装転用済み、挙動を null 埋めへ差し替える)
6. **利得**: スキーマ発見性 (そのコマンドレベルで出うるキーが常に一覧できる)、presence check 不要
   (`obj.k === null` 一本)、言語バインディングは `T | null` へ自然に写る

## 2. 裁定確定 (NUL-Q1〜Q4 / NUL-C1、2026-08-01)

- **NUL-Q1 = b: fixture は逐語で全キーを書く** (runner 自動補完は不採用)。理由 (kawaz mid=40):
  記述コストの恒常増は大した量でなく、全列挙は case 比較がしやすい。初回書き換え ~560 case は
  一度きりの投資
- **NUL-Q2 = a: effects の op 語彙を set に統一** — unset 発火 = `{"op":"set","operand":null}`、
  empty 発火 = `{"op":"set","operand":[]}`。op=unset / op=empty の観測語彙は廃止
- **NUL-Q3 = a (一括)**: or は**セル単位で 1 キー** (unset なら `cell: null`、枝は同時列挙しない —
  DR-120 §2 の帰結) / repeat 行の内側も静的宣言キーは null 埋め (tuple `[null, x]` と同型) /
  **動的キー構造 (from_entries / merge / kv-map / config 由来 map) は present のみ** /
  **record (DR-126) の内側も反転** — closed 語彙なので全フィールド列挙 + null、型導出は `T | null`
  (DR-126 §3 改定対象)
- **NUL-Q4 = a: sources も null** — result と同型のキー集合を維持 (DR-122 §1 の座対応優先。
  null 座 = 確定主体なし)
- **NUL-C1 (全承認)**: presence marker (DR-052 §3 の空 kv) は概念ごと廃止 / `export_key: null` は
  別軸の null (結果キー軸メタ、元々 DR-052 §4 で string|null — 今回の値 null と無関係) として残置・
  改名しない / 型導出は T / T? → T / T | null へ機械読み替え / DR-103 の未選択 scope 述語不参加は
  裁定不変・根拠付け替えのみ / `absent-ref`・`absent-source`・link-parse/absent-target.json は
  別概念 (参照先不在) で転換対象外 (機械置換禁止) / **Sentinel 転換は別 DR に分けて起草**

## 3. Sentinel 転換 (別 DR、チャット裁定 mid=32〜38)

- **unset → 「null を返す」に統一** (mid=32): fn が null を返す = unset 効果 (committed=false、
  ラダー開放)。`set(null) = unset`。Sentinel としての unset は消える
- **empty → 対象型の空値を返す普通の Value fn 化** (mid=36〜37): committed=true 意味論は不変。
  型依存の空値 ([] / {}) は set / borrow と同じ target 型依存 fn パターン (DR-113 §5.3)。
  「行としての []」(accumulator 供給) と「クリアとしての []」(セル操作の座) は**適用の座**で
  区別され値では混ざらない — `--no-numslist` (no:empty) のクリア後に append すれば `[[2,3]]` (mid=37/38)
- **default は Sentinel として残留** (mid=33): 定義注入の cell_fn を拾う機構的都合
- 帰結: Sentinel union は実質 default 1 つに縮小。DR-114 §5.4「default 席で Sentinel 不可」/
  DR-127 §4.1「Sentinel は Reject」の特例群が最小化
- 補足 (mid=39/40 確認): set variant の args あり形 (`"55:set:5:5"`) は固定 operand を運ぶ 0-token
  入口で、accum セルでは行 append — `--numslist 5 5` とセル効果レベルで等価 (経路・補完面は別入口)。
  既存仕様どおりで転換の影響なし

## 4. 影響規模 (2026-08-01 調査の要約)

- DR: **DR-051 全面 supersede** (新 DR)。部分改定 8 本 (DR-052 §3§4 / DR-121 / DR-122 §2 /
  DR-123 §3 / DR-081 / DR-103 明確化 / DR-126 §3 / DR-120 §4)。注記 12 本
  (DR-016/031/044/045/050/087/088/089/093/113 §5.4/114/127)
- docs 本体: 27 箇所 (DESIGN §2.6 L214-216 と CONFORMANCE §2/§3 L92,L104-105 が本丸。
  LOWERING §122/§215・DESIGN L545 の「absent = 入口なし」3 箇所は wire 入力側 presence の別軸で対象外)
- fixture: success + result 保持 560 case が逐語全列挙化の対象 (NUL-Q1=b)。why 文の absent 言及
  87 ファイル / 105 case は別パス。sources 付き 199 case (欠落あり 20) に null 座追加
- 実装: kuu.mbt は resolve.mbt の build_result (L580-909) / default_cells 系 / source_shadow
  (L1568-1754) に集中。kuu-cli は dispatch/as_object 経路のみで影響小
- 誤爆注意: absent-ref / absent-source / link-parse/absent-target.json は別概念 — 機械置換禁止

## 5. サイクル分割 (調査の推奨 + サイクル 0 済み)

- ~~サイクル 0: DR-127 第 1 波の着地~~ (済み 2026-08-01 — kuu.mbt bcd4b06b push・CI green)
- サイクル 1: 本ノート正本化 (済み) → **DR 起草 2 本** (null 反転 = DR-051 supersede / Sentinel 転換)
- サイクル 2: docs 本体 27 箇所 (fixture より先に CONFORMANCE 比較規約を確定)
- サイクル 3: fixture 560 case (ディレクトリ単位で並列化可、export-key 43 / value-typing 31 は目視枠、
  why 文 87 ファイルは別パス)
- サイクル 4: kuu.mbt (build_result 系 + source_shadow + conformance decoder、単一 writer)
- サイクル 5: kuu-cli 追随 → lockstep push (spec → kuu.mbt pin → kuu-cli pin)

## 5b. 追補裁定 (2026-08-01、DR 起草後の統括裁定 — 異議あれば差し戻し可)

- **`absent-source` (値不在側) は廃止方向**: DR-130 下では参照先の座は不在にならず null になるため、
  borrow は null を返し `set(null) = unset` が呼び出し元へ伝播する — DR-113 §5.4 の
  「absent-source で呼び出し元も unset のまま落ちる」規定は DR-131 の一規則に吸収される。
  `absent-ref` (名前解決失敗、定義時) は別概念で不変。NUL-C1 の「absent-source は転換対象外」は
  誤爆置換防止の意図であって意味論の温存指示ではない、と整理。fixture
  `value-sources/default-fn-borrow-ladder.json::borrow-source-absent` の期待値は null 形へ更新対象
- **行供給の座 (accumulator の値スロット) への null = 供給なし (行を積まない)**: `set(null) = unset`
  の一規則を全座へ貫く。null 行 (`[null]` の行) は発火の産物として作らない。DR-127 の link 値残余座の
  `set(null)` も同様にその座を null へ戻す
- **`fixtures/absent/` (4 ファイル) は `fixtures/null-projection/` へ改称**: absent 意味論そのものの
  pin 領域なので書き直し + 領域名も現行化 (absent 語のディレクトリ残置は誤爆源)。台帳・pin の参照有無は
  サイクル 3 で確認
- committed の担い手: DR-131 §2 の「set の committed は operand が null かで決まる」(worker 導出) を
  統括承認 — DR-045 §2 の明示制御原則を op から operand へ移す形
- update op の既存不整合 (DR-045/077 vs CONFORMANCE) は本転換と独立の issue として起票

## 6. 未決の隣接論点 (本転換に含めない)

- link 入口の name/export_key による二重露出 (mid=29 提起、方向感未確定) — 別 Q として継続
- DR-127 第 2 波 (abi.Value 複合値モデル・値空間残余・vivify) — null 反転の実装サイクルと統合するか
  後続にするかはサイクル 4 の計画時に判断

## 7. 関連

- DR-051 (supersede 対象) / DR-052 / DR-120 / DR-121 / DR-122 / DR-123 / DR-126 / DR-127
- docs/research/2026-07-28-link-fixed-path-dsl-design.md (LNK2-Q1 の経緯)
- docs/research/2026-07-31-type-input-structure-splice.md (record / splice — NUL-Q3 の record 反転が波及)
