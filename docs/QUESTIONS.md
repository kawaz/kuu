# 裁定・確認待ち一覧 (ユーザ用)

> 運用規約 (ゼロコンテキスト読者向け、正本は claude-rules-personal の
> `questions-md-registry` rule):
> - 裁定待ち = ユーザの判断が要る項目。確認待ち = 実装済みで実機確認を待つ項目
> - ラベルはバッチ / セッション毎に一意な短プレフィクス (XX-Q1 / XX-C1 形式、
>   Qn 単独の使い回し禁止、長期一意性は不要)
> - 👺 は「いま待っている項目」とチャットの依頼文にだけ付ける
>   (裁定済み・過去参照に付けない。ユーザは正規表現でハイライト/アラームしており
>   誤陽性が有害)
> - チャット提示と同一ターンで本ファイルに記録 + path 指定 commit
> - 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue /
>   journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 確認待ちの削除条件: ユーザが確認 OK を返した / 後続リリースで当該実装が
>   上書きされ確認対象でなくなった
> - 参照パスはリポ内相対 (リポ外はフルパス)

## 裁定待ち

### 👺LINKSRC-Q1: `link` を値源タグとして独立させるか、`cli` に畳むか

DR-031 は「**link 越しの効果** (他要素の入口から link で飛んできた) = `link`。両者はラダー
同順位で、区別は経路の違いのみ」と規定し、DR-098 §6 も 7 語彙に `link` を含めている。

**しかし実装は `link` を `cli` に畳んでいる。** kuu.mbt の `src/abi/value.mbt:44`:

```moonbit
pub(all) enum Source {
  Cli // CLI explicit / link — highest seat (DR-031 #1)
  Env
  ...
}
```

`Link` という値が存在せず、コメントで明示的に畳んでいる。

**corpus に `link` を source 値として pin する fixture は 0 件**なので、この乖離が
検出されていなかった。2026-07-26 に CONFORMANCE と `schema/fixture.schema.json` の enum へ
`link` を追加したが (DR-098 §6 への追従として)、**その結果 spec が実装より先に出た状態**になっている。

なお `link` 属性自体を parse 面で使う定義も現行実装は decode できない
(`option has unsupported key 'link'`)。DESIGN §「共通ノード形」には宣言形が載っている。

#### 選択肢

- **(a) spec どおり `link` を独立タグにする (実装を追随させる)** — `Source` に `Link` を足し、
  link 経由の効果を区別して報告する。消費者は「この値は別の入口から飛んできた」を知れる。
  実装コストは `link` 属性の decode 対応から要る (現状 parse 面で未対応)
- **(b) `cli` に畳む (spec を実装に合わせる)** — DR-031 の「区別は経路の違いのみ」を
  「経路の違いは source では区別しない」に改め、CONFORMANCE / schema の enum から `link` を外す。
  DR-031 / DR-098 の当該記述に amendment が要る
- **(c) 現状維持 (enum には残すが実装は畳んだまま)** — **不採用**。
  「spec に書いたが実装が満たさない」状態を公開することになり、他言語実装が
  どちらに従うか判断できない

#### AI の推し: 判断材料が足りない

**`link` の設計意図が読めていない。** DR-031 は「両者はラダー同順位で、区別は経路の違いのみ」と
書いており、これは「同順位だから区別する意味がある」とも「同順位だから畳んでよい」とも読める。

消費者が `link` を知って何をするかの用途が spec から読み取れない
(DR-109 §3 の「値の出所を機械判別できる」は満たすが、`cli` と `link` を区別する必要性までは
書かれていない)。**用途があるなら (a)、無いなら (b)** で、その判断は設計意図を持つ側にある。

**関連**: `docs/decisions/DR-031-value-source-precedence.md` の source 確定ルール /
DR-098 §6 (7 語彙) / `docs/CONFORMANCE.md` §2 の sources 語彙 /
`schema/fixture.schema.json` の sources enum / kuu.mbt `src/abi/value.mbt:44`

## 確認待ち

(現在なし)
