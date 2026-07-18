# 主要言語パッケージレジストリでの `kuu` 名前確保調査

> 由来: kawaz 依頼 (2026-07-18)「主要なパッケージレジストリにほぼ空実装の v0.0.1 で名前空間を確保したい。どんなレジストリがあるか主要なところを全部押さえて登録手順を」。方針裁定済み: (1) 空 stub でなく **kuu-cli 依存参照型の最小 genuine ラッパー** (version() + kuu-cli subprocess 呼び + spec README 誘導) で誠実に確保、(2) `kuu` が取られ済みのレジストリ (PyPI/pub.dev) のフォールバック名と GitHub org は `kuu-lang` で統一候補 (org は後から移転可能なので名前確保のみ先行)。統括実測の空き状況: crates.io/RubyGems/Hex.pm/NuGet/LuaRocks/Hackage = 空き、npm kuu = 2016 年の空 0.0.0 (dispute 候補、@kuu scope は未作成)、PyPI/pub.dev = 実プロダクトに取られ済み、mooncakes = kawaz/kuu 確保済み。


**目的**: 「kuu」を主要な言語パッケージレジストリにほぼ空実装 (v0.0.1) で場所取りするための情報を、レジストリごとに 6 観点で整理する。

**観点**:
1. **名前空間**: フラット / スコープ・org 型 / 両方。「kuu」「@kuu」「kuu/」のどれを押さえるか。
2. **空パッケージ場所取りの可否とポリシー**: name squatting 禁止規定の有無・強度。
3. **登録手順**: アカウント → 認証 → publish のコマンド列 (コピペ粒度)。
4. **名前削除・再利用ルール**: unpublish 制限、放棄名の再取得手順。
5. **費用**: 無料 / 有料。
6. **空き確認方法**: URL / API。

**運用注意**: squatting 禁止のレジストリは「実体のある最小実装」を置くこと (空 stub を publish して規約違反で剥奪されると失う)。

## サマリ (squatting リスク別)

| Group | レジストリ | 空 stub OK? |
|---|---|---|
| **A. squatting 明示禁止** — 実体ある最小実装が必須 | crates.io / RubyGems / PyPI | ❌ (削除リスク) |
| **B. スコープ登録型** — 名前確保に組織/ドメインの認証だけで済み、パッケージ実体は後で OK | Maven Central / JSR / Hex.pm (org) / NuGet (prefix reservation) / npm (@scope) | ○ (org/scope 単位で確保) |
| **C. 実質フラットで squatting 規定弱** — 空 v0.0.1 でも即問題化しにくいが、名前が有用なら奪還請求リスク | npm (フラット) / Packagist / pub.dev / Hackage / CPAN | 条件付き ○ |
| **D. レジストリ登録なし** — 名前は VCS + module path で決まる | Go (pkg.go.dev) / Swift Package Registry (現状) / Zig | 「github.com/kawaz/kuu」等の path 確保が実質の名前確保 |
| **E. Tap/Formula 系** — 中央レジストリでなく自分の tap が実体 | Homebrew | tap 名 (kawaz/tap) が主、formula 名は tap 内一意 |

---

## 1. npm (Node.js) https://www.npmjs.com

- **名前空間**: フラット (`kuu`) と scoped (`@kuu/xxx`) の 2 層。scope は user 名または organization 名。
- **squatting 規約**:
  - npm は squatting 主張だけで名前を移転しない。**商標保有者だけが GitHub Support の trademark form 経由で移転請求可**。
  - パッケージ名は「genuine function が無い」なら squatted 扱いだが、npm 側は proactive に監視せず削除もしない。
  - ユーザ名は「使わなくても正当」として明示的に保護される (削除ほぼ無し)。
  - 組織名は「合理期間内に package publish 無し」で squatted 扱いだが、実際の移転は trademark 要件を満たさない限り運用上ほぼ動かない (community discussion 実例)。
- **unpublish**: 現行 policy は 72 時間ルール (2020-01-30 改訂、旧 24 時間ルールは廃止)。72h 以内なら依存者不在の条件で unpublish 可、以降は 300 downloads/week 未満 + 依存無し等の条件付き。完全 unpublish 後は同名の新 publish は **24 時間ブロック**、同 `name@version` は永久に再利用不可。
- **登録手順**:
  ```bash
  # 1. アカウント作成: https://www.npmjs.com/signup (email/username/password、MFA 強く推奨)
  # 2. CLI ログイン
  npm login             # または npm adduser
  # 3. 空 package を publish
  mkdir kuu && cd kuu
  npm init -y           # package.json の name を "kuu" に
  echo "// kuu" > index.js
  echo "# kuu" > README.md
  npm publish           # フラット名 kuu
  # scope: package.json name を "@kuu/core" 等にして
  npm publish --access public  # scoped パッケージは既定 private なので明示
  # 組織 scope 確保: https://www.npmjs.com/org/create で org "kuu" を作成 (free tier で public 可)
  ```
- **名前の再利用**: 完全 unpublish 後 24h は同名 publish 不可。名前奪還は trademark 経由のみ。
- **費用**: public package と public org は無料。
- **空き確認**:
  - フラット: `curl -sI https://registry.npmjs.org/kuu` → 404 なら空
  - scope org: `https://www.npmjs.com/settings/kuu` (存在チェック、UI ベース)
- **kuu 押さえ方の推奨**:
  - フラット `kuu` を確保するなら **実体のある最小実装** (README + LICENSE + 1 export) が安全 (削除リスクは低いが、community 通報で issue 化する可能性あり)
  - **`@kuu/*` scope + org "kuu" 確保** が最重要。org を取れば scope 配下は自由に切れる (moon の各サブパッケージ等の受け皿)
- **出典**:
  - https://docs.npmjs.com/policies/disputes/
  - https://docs.npmjs.com/policies/unpublish/

---

## 2. crates.io (Rust) https://crates.io

- **名前空間**: **完全フラット**。scope・org の概念なし (`kuu` 1 個だけ)。crate 名は ASCII 英数字 + `-` + `_` の 64 文字以内。
- **squatting 規約**: **明示禁止**。Acceptable Use Policy に「genuine functionality・purpose を持たずに長期間名前を予約する crate」を明示禁止、buying/selling/trading も禁止 (RFC 3463、PyPI PEP 541 由来)。crates.io team が違反 crate を削除できる。大規模 squatting は無通知削除もあり、通常は justification の機会を与える。proactive 監視は無く、community 通報 (help@crates.io) 起点。
- **登録手順**:
  ```bash
  # 1. GitHub OAuth で https://crates.io にサインイン
  # 2. Account Settings → API Tokens で token 発行
  cargo login <token>
  # 3. 最小 crate を作成
  cargo new --lib kuu
  cd kuu
  # Cargo.toml に description / license / repository を必ず記入 (必須メタ)
  # v0.0.1 でも中身が genuine (README + Cargo.toml + minimal lib.rs で spec 参照実装への road map を書く等) にする
  cargo publish
  ```
- **削除規則**:
  - 自主削除は「72 時間以内」または「単一 owner + 1000 downloads/月 未満 + 依存無し」で可能。
  - 名前の再取得は既存 owner に直接連絡が正規。owner が応じない・不在なら crates.io team 経由の transfer 手続きが必要 (squatting 該当なら削除も選択肢)。
  - **予約名ブロックリスト**: Windows reserved device name (nul, com0, lpt0 等) を publish 拒否。「kuu」は該当しない。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://crates.io/api/v1/crates/kuu` → 404 (`"errors":[{"detail":"Not Found"}]`) なら空
  - UI: https://crates.io/crates/kuu
- **kuu 押さえ方の推奨**: **空 stub は禁則違反リスクが最大**。以下のいずれかを満たす最小実装で publish:
  - README に「kuu specification の Rust 参照実装 (WIP)」と用途を明記
  - Cargo.toml に repository / description / license を必ず埋める
  - lib.rs にせめて 1 関数 (`pub fn version() -> &'static str { "0.0.1" }`) 等 genuine な API を置く
- **出典**:
  - https://crates.io/policies
  - https://rust-lang.github.io/rfcs/3463-crates-io-policy-update.html
  - https://doc.rust-lang.org/cargo/reference/publishing.html

---

## 3. PyPI (Python) https://pypi.org

- **名前空間**: **フラット** (ultranormalization。`kuu` / `Kuu` / `k-u-u` 等は同一視される)。PEP 752 の namespace prefix (`kuu-*` の予約) は proposal 段階。
- **squatting 規約**: **PEP 541 が公式方針**。
  - 「無機能・空プロジェクト」は "invalid project" として削除対象。
  - 積極 monitor は無し、通報起点。moderator が個別対応。
  - **既存の active owner に対しては、reachable なら本人の同意なく移転しない**、放棄も理由にしない。
  - 名前移転条件: 現 owner が unreachable (3 回連絡・6 週間応答無し) + 引き取り側が criteria を満たす。
- **登録手順**:
  ```bash
  # 1. https://pypi.org でアカウント作成 (MFA 必須、2024 以降)
  # 2. Account Settings → API tokens で token 発行
  # 3. 最小 package を用意
  mkdir kuu-py && cd kuu-py
  # pyproject.toml (PEP 621)
  cat > pyproject.toml << 'EOF'
  [build-system]
  requires = ["hatchling"]
  build-backend = "hatchling.build"
  [project]
  name = "kuu"
  version = "0.0.1"
  description = "kuu specification reference (placeholder for future Python bindings)"
  readme = "README.md"
  license = { text = "MIT" }
  authors = [{ name = "kawaz" }]
  EOF
  mkdir kuu && echo "__version__ = '0.0.1'" > kuu/__init__.py
  # 4. build + upload
  pip install --user hatch twine
  hatch build
  twine upload --username __token__ --password <pypi-token> dist/*
  ```
- **削除規則**:
  - unpublish は公式には非推奨 (再利用不可、historical value 尊重)。ただし PyPI の owner UI で release 削除は可能 (72 時間ルール等の一律制限は無い)。
  - project 名は削除しても他者に再割当されない場合がある (`filename reuse` policy: 同名ファイルの再アップロード禁止)。
  - 「Test PyPI」 (https://test.pypi.org) で予行練習可、本 PyPI とは別 registry。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://pypi.org/pypi/kuu/json` → 404 (`{"message": "Not Found"}`) なら空
  - UI: https://pypi.org/project/kuu/
  - **ultranormalization に注意**: 大小・記号の差異で衝突。`normalize_name` は PEP 503。
- **kuu 押さえ方の推奨**:
  - README に用途 (spec の Python バインディング placeholder) を書き、**「invalid project」判定を回避**する説明を含める
  - Test PyPI で一度公開してから本 PyPI へ
- **出典**:
  - https://peps.python.org/pep-0541/
  - https://docs.pypi.org/project-management/name-retention/

---

## 4. RubyGems (Ruby) https://rubygems.org

- **名前空間**: **フラット**。scoped gems RFC はあったが 2026-03 に archive (read-only) 化、事実上棚上げ。
- **squatting 規約**: crates.io と近い禁止規定。「名前予約目的の中身無し gem」を Acceptable Use で禁止、buy/sell/trade も禁止。ただし「security 目的の予約は description で明示すれば OK」とする例外あり (defensive registration の慣行を残す設計)。
- **登録手順**:
  ```bash
  # 1. https://rubygems.org/sign_up でアカウント作成、MFA 強く推奨 (人気 gem は必須)
  # 2. 最小 gemspec
  mkdir kuu && cd kuu
  cat > kuu.gemspec << 'EOF'
  Gem::Specification.new do |s|
    s.name        = "kuu"
    s.version     = "0.0.1"
    s.summary     = "kuu specification reference (placeholder)"
    s.description = "Reserved for future Ruby bindings of the kuu specification. See https://github.com/kawaz/kuu"
    s.authors     = ["kawaz"]
    s.email       = "..."
    s.files       = ["lib/kuu.rb"]
    s.homepage    = "https://github.com/kawaz/kuu"
    s.license     = "MIT"
  end
  EOF
  mkdir lib && echo 'module Kuu; VERSION = "0.0.1"; end' > lib/kuu.rb
  gem build kuu.gemspec
  gem push kuu-0.0.1.gem   # 初回は API key / MFA 入力
  ```
- **削除規則**: `gem yank kuu -v 0.0.1` で yank 可 (index から外れるが再 push は不可、同名+同 version の再利用禁止)。gem 名自体の削除は support 経由。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://rubygems.org/api/v1/gems/kuu.json` → 404 (`{"error":"Not Found"...}`) なら空
  - UI: https://rubygems.org/gems/kuu
- **kuu 押さえ方の推奨**: description に **「security reservation」or「future bindings」の明示** を含めれば policy exception に該当。名前確保だけなら v0.0.1 stub でも運用上安全側に倒せる。
- **出典**:
  - https://rubygems.org/policies/acceptable-use
  - https://guides.rubygems.org/publishing/

---

## 5. pkg.go.dev / Go modules — https://pkg.go.dev

- **特殊事情**: **中央レジストリ登録という概念が無い**。Go module は「module path = 取得可能な URL」で識別され、`module github.com/kawaz/kuu` のように **VCS ホスト + owner + repo で確定**。pkg.go.dev はドキュメント・検索インデックスであって「publish 先」ではない。
- **名前空間**: `github.com/kawaz/kuu` のような VCS path そのものが name。「短い kuu」だけを取ることはできない (path 全体が名)。
- **squatting 規約**: レジストリでは無いので squatting policy 非該当。VCS 側 (GitHub 等) の TOS が支配。
- **登録手順**:
  ```bash
  # 1. github.com/kawaz/kuu を作成 (これで実質「Go module path 確保」)
  # 2. リポジトリに go.mod
  go mod init github.com/kawaz/kuu
  # 3. semver tag を打つ
  git tag v0.0.1 && git push --tags
  # 4. proxy にトリガして pkg.go.dev にインデックス
  GOPROXY=proxy.golang.org go list -m github.com/kawaz/kuu@v0.0.1
  # 数分〜数十分で https://pkg.go.dev/github.com/kawaz/kuu に表示される
  ```
- **削除規則**: tag を消しても proxy にはキャッシュが残る (immutability)。`retract` directive で hide 可。VCS を削除しても pkg.go.dev には残る場合あり。
- **費用**: 無料 (GitHub 側の費用のみ)。
- **空き確認**:
  - `curl -s https://pkg.go.dev/github.com/kawaz/kuu` → 404 なら未インデックス
  - しかし本質は `github.com/kawaz/kuu` が空いているかで判定 (`gh repo view kawaz/kuu` で確認)
- **kuu 押さえ方の推奨**: **既に `github.com/kawaz/kuu` があるので Go の name は事実上確保済み**。あとは semver tag 打って proxy にインデックスさせるだけ。
- **出典**:
  - https://go.dev/doc/modules/publishing
  - https://pkg.go.dev/about

---

## 6. Maven Central (Java/Kotlin/Scala) https://central.sonatype.com

- **名前空間**: **groupId + artifactId + version** の 3 座標。groupId は逆ドメイン (`com.example.foo` = example.com の所有者) が原則。artifactId は groupId 内で自由。
- **squatting 規約**: 「namespace 単位」で登録者を認証するため、パッケージ実体の有無より **ドメイン所有 (or GitHub username) の verification** が支配的。ドメインを取れば artifactId の細粒度確保は publish 側の裁量。artifact 単体の name squatting 概念は薄い。
- **登録手順**:
  ```bash
  # 1. https://central.sonatype.com にサインアップ (GitHub OAuth 推奨)
  # 2. namespace 登録
  #    - GitHub OAuth 経由なら io.github.kawaz が自動 verify (github.io ドメイン所有として)
  #    - 独自ドメイン所有なら com.example (DNS TXT レコード で Verification Key を記述)
  # 3. GPG 鍵をアップロード (署名必須)
  gpg --gen-key
  gpg --keyserver keys.openpgp.org --send-keys <key-id>
  # 4. pom.xml に groupId="io.github.kawaz", artifactId="kuu", version="0.0.1"、name/description/url/licenses/scm/developers 必須
  # 5. Maven プラグイン
  mvn deploy   # central-publishing-maven-plugin 経由 → Portal validation → Release
  ```
- **削除規則**: **一度公開した artifact は不変・削除不可**。groupId 単位で「publish 権限」を持つのは verify 済みユーザのみ。artifactId は groupId 内で自由。
- **費用**: 無料。
- **空き確認**:
  - `https://central.sonatype.com/search?q=kuu` で全 groupId 横断検索
  - 特定座標: `https://repo.maven.apache.org/maven2/io/github/kawaz/kuu/` → 404 なら空
- **kuu 押さえ方の推奨**:
  - `io.github.kawaz` namespace を登録 → その下に `io.github.kawaz:kuu:0.0.1` を publish (これは groupId の verify 主義なので squatting 論争にならない)
  - `com.kuu` 等の短いドメインを取れれば `com.kuu:kuu` も可能 (ただし DNS 所有証明必須、`kuu.com` は既に取得困難)
- **出典**:
  - https://central.sonatype.org/register/namespace/
  - https://central.sonatype.org/publish/publish-portal-maven/

---

## 7. NuGet (.NET) https://www.nuget.org

- **名前空間**: **フラット**。scoping なし。ただし **Package ID prefix reservation** (「Kuu.*」等の prefix を owner ごとに予約) 制度あり。
- **squatting 規約**: prefix reservation を除けば first-come first-serve。「System.*」等の official 名は非公式利用を禁じる注意書きあり。個別 name の squatting は明示禁止規定なし。
- **登録手順**:
  ```bash
  # 1. https://www.nuget.org でサインイン (Microsoft account / GitHub 等)
  # 2. Account settings → API Keys → Create (Push scope, Glob pattern *)
  # 3. 最小 nupkg
  dotnet new classlib -n Kuu
  cd Kuu
  # Kuu.csproj に <PackageId>kuu</PackageId>, <Version>0.0.1</Version>, Author/Description/License を追加
  dotnet pack -c Release
  dotnet nuget push bin/Release/kuu.0.0.1.nupkg --api-key <NUGET_API_KEY> \
    --source https://api.nuget.org/v3/index.json --skip-duplicate
  # 4. Prefix reservation (任意): kuu.* を確保したい場合、
  #    account@nuget.org に「display name + reserved prefix "Kuu.*"」を mail 申請
  ```
- **削除規則**: **version は immutable** (`--skip-duplicate` で衝突対応)。unlist は可能 (検索から除外、既存 restore は続く)。完全削除は support 経由 (稀)。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://api.nuget.org/v3-flatcontainer/kuu/index.json` → 404 なら空
  - UI: https://www.nuget.org/packages/kuu
- **kuu 押さえ方の推奨**:
  - まず `kuu` を最小 nupkg で publish
  - 続けて **`Kuu.*` の prefix reservation を mail 申請** (kawaz を owner display name として)。承認後は他者が `Kuu.Foo` を新規 publish できなくなる (既存不変)。
- **出典**:
  - https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation
  - https://learn.microsoft.com/en-us/nuget/nuget-org/publish-a-package
  - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-push

---

## 8. Hex.pm (Elixir / Erlang) https://hex.pm

- **名前空間**: 基本はフラット (`kuu`)。組織所有 package (`kuu` が organization "kawaz" の管理下) を作れるが、パッケージ名自体はフラット namespace を共有。organization の私設 private repo は有料。
- **squatting 規約**: 公式 dispute policy あり。「abandoned package の take over」「original author 主張」「squatting 通報」「misleading name 通報」の 4 経路が定義。連絡先: support@hex.pm。
- **命名慣習**: 拡張 package は元 package 名を prefix (`plug_ext` 等)、他言語からの port は `_ex` prefix/suffix を推奨 (community 慣習、規約ではない)。
- **登録手順**:
  ```bash
  # Elixir 版
  # 1. mix hex.user register (email/username/password/MFA)
  # 2. mix.exs に project name "kuu", version "0.0.1", package{licenses:[..], links:{...}, description:...} を書く
  mix hex.publish
  # または rebar3 版
  # rebar.config に {plugins, [rebar3_hex]}, {hex, [{doc, edoc}]}
  # rebar3 hex user register
  # rebar3 hex publish
  ```
- **削除規則**: **repository は原則 immutable**。初回 publish 後 **24 時間以内** なら revert/update 可、新 version は **1 時間以内** なら revert/update 可。以降は retire (非推奨扱いにする、削除ではない) のみ。
- **費用**: public package + public organization は無料。private organization は有料。
- **空き確認**:
  - `curl -s https://hex.pm/api/packages/kuu` → 404 (`{"status": 404, ...}`) なら空
  - UI: https://hex.pm/packages/kuu
- **kuu 押さえ方の推奨**: `licenses: ["MIT"]` 必須、`links: {"GitHub" => "..."}` に kawaz/kuu を明示、description に用途 (spec 参照実装 placeholder) を書く。dispute policy が明確なので、後日 abandoned 判定されないよう README で活動継続を示す。
- **出典**:
  - https://hex.pm/docs/publish
  - https://hex.pm/policies/dispute
  - https://hex.pm/docs/faq

---

## 9. mooncakes.io (MoonBit) https://mooncakes.io

- **名前空間**: **必須 2 階層** `<username>/<package_name>`。GitHub username がそのまま namespace になる。フラット `kuu` は不可、必ず `kawaz/kuu`。
- **squatting 規約**: 公式明文なし (新しめのレジストリ)。username は自分の namespace になる仕組みなので、他ユーザに `kawaz/*` を取られる心配はない。
- **登録手順**:
  ```bash
  # 1. moon register (or moon login) で GitHub 連携アカウント作成
  # ~/.moon/credentials.json に API token が保存される
  moon register    # 初回
  moon login       # 既存アカウント
  # 2. moon.mod.json の name を "kawaz/kuu" に (username prefix 必須)
  #    version は semver、license は SPDX identifier、repository/keywords/description 推奨
  moon new kuu     # 新規プロジェクト
  # moon.mod.json 編集:
  # {
  #   "name": "kawaz/kuu",
  #   "version": "0.0.1",
  #   "license": "Apache-2.0",
  #   "readme": "README.md",
  #   "repository": "https://github.com/kawaz/kuu",
  #   "keywords": ["parser", "specification"],
  #   "description": "kuu specification reference implementation"
  # }
  moon check
  moon publish
  # → https://mooncakes.io/docs/kawaz/kuu にドキュメント自動生成
  ```
- **削除規則**: version 単位で published 後の変更は semver 順序制約 (次 version は必ず前より上)。個別削除の公式手順は未確認 (support 経由と推測)。
- **費用**: 無料。
- **空き確認**:
  - UI: https://mooncakes.io/docs/kawaz/kuu → 404 なら未発表
  - 現状 kuu (参照実装リポ) は kawaz namespace に自動 reserved 相当 (他人が kawaz/* を publish できない)
- **kuu 押さえ方の推奨**: **他レジストリで一番安全な形**。GitHub username = namespace なので構造的に他者が奪えない。moon.mod.json の name を `kawaz/kuu` にして `moon publish` するだけ。
- **出典**:
  - https://docs.moonbitlang.com/en/latest/toolchain/moon/module.html
  - https://docs.moonbitlang.com/en/latest/toolchain/moon/package-manage-tour.html
  - https://www.moonbitlang.com/blog/intro-to-mooncakes

---

## 10. JSR (Deno / TypeScript) https://jsr.io

- **名前空間**: **scope 必須**。`@scope/name` フォーマットで、scope 側は事前登録が必要 (フラット名は不可)。
- **squatting 規約**: **明示禁止**。「使うつもり無しの scope/package 登録」「他者の正当な利用を防ぐ目的の登録」を禁止。「reserved したが使わなかった」は現実的な余地を認めるスタンス。過度に generic な名前は moderator 裁量で対応。**quota として 1 user 最大 3 scope** (要相談で増枠) が squatting 抑止装置。
- **登録手順**:
  ```bash
  # 1. https://jsr.io にサインイン (GitHub OAuth)
  # 2. https://jsr.io/new で scope "@kuu" を作成 (無料、3 scope quota 内)
  # 3. リポジトリを scope にリンク (GitHub Actions 経由 publish 推奨、secret 不要)
  # 4. jsr.json / deno.json を用意
  #    { "name": "@kuu/core", "version": "0.0.1", "exports": "./mod.ts" }
  # 5. publish
  deno publish      # or: bunx jsr publish (bun 環境なら)
  # GitHub Actions で自動化する場合:
  # - リンク済みリポの workflow なら secret なしで publish 可
  ```
- **削除規則**: 一度公開した version は基本 immutable。scope 内の package 追加 delete は admin 権限で可能。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://jsr.io/@kuu/meta.json` → 404 なら scope 未使用
  - UI: https://jsr.io/@kuu
- **kuu 押さえ方の推奨**: **scope `@kuu` を確保**するのが本命 (squatting 抑制が強く、確保が正規)。scope 配下に `@kuu/core` 等の最小 export を publish (TypeScript source そのまま、build 不要)。
- **出典**:
  - https://jsr.io/docs/usage-policy
  - https://jsr.io/docs/scopes
  - https://jsr.io/docs/quotas-and-limits

---

## 11. pub.dev (Dart / Flutter) https://pub.dev

- **名前空間**: **フラット** (`kuu`)。verified publisher (ドメイン所有) と個人アカウントの 2 系統あるが名前空間は共通。
- **squatting 規約**: 「客観的に genuinely useful でない code」を squatting と定義。**reactive・人手 review** で対応、proactive scan なし。first-come で publish 者が唯一の追加 upload 権限保有者。trademark 系は Google Trademark 経由。
- **削除規則**: **永続保存が原則**、unpublish はほぼ不可 (「非常に限定的な場合のみ」)。version の retract は publish 後 **7 日以内** に可能 (deletion ではない、依存者は既存 pin から使い続けられる)。
- **登録手順**:
  ```bash
  # 1. https://pub.dev に Google account でサインイン
  # 2. pubspec.yaml
  # name: kuu
  # version: 0.0.1
  # description: "kuu specification reference (placeholder for future Dart bindings)"
  # environment: { sdk: ">=3.0.0 <4.0.0" }
  # homepage: https://github.com/kawaz/kuu
  # repository: https://github.com/kawaz/kuu
  # 3. dart pub publish   (初回は browser 認証)
  # → --dry-run で事前チェック推奨
  ```
- **費用**: 無料 (verified publisher も無料)。
- **空き確認**:
  - `curl -s https://pub.dev/api/packages/kuu` → 404 なら空
  - UI: https://pub.dev/packages/kuu
- **kuu 押さえ方の推奨**: unpublish がほぼ不可なので **一度 publish したら実質永続確保**。description で用途を genuinely 説明すれば squatting 通報リスクは低い。可能なら **verified publisher (kuu.dev 等のドメイン所有)** を取ればブランド強度 up。
- **出典**:
  - https://pub.dev/policy
  - https://dart.dev/tools/pub/publishing
  - https://dart.dev/tools/pub/verified-publishers

---

## 12. Packagist (PHP / Composer) https://packagist.org

- **名前空間**: **`vendor/package` 必須の 2 階層**。vendor は Packagist に先着で登録した author が独占 (`kuu/*` を全部押さえる形が可能)。
- **squatting 規約**: 明文の squatting policy は無く first-come first-serve。ただし maintainer が手動で「useless package」を削除する慣行あり (実例: momolog/monolog の typo squat 削除)。vendor 名の 2 階層で typo squatting はある程度緩和される設計。**vendor 保護**: 一度 vendor でパッケージが publish されたら、その vendor 名の追加 publish は既存 vendor 内 package の maintainer だけが可能 (= vendor 単位の実効的な予約になる)。
- **登録手順**:
  ```bash
  # 1. https://packagist.org でアカウント作成
  # 2. GitHub 等に vendor/package 名を持つリポジトリを作成
  #    composer.json (最小):
  #    {
  #      "name": "kuu/kuu",
  #      "description": "kuu specification reference (placeholder)",
  #      "type": "library",
  #      "license": "MIT",
  #      "authors": [{"name": "kawaz"}],
  #      "require": {"php": ">=8.1"}
  #    }
  # 3. composer validate  (syntax check)
  # 4. git 経由で公開後、Packagist の Submit ページで repository URL を送信
  # → 以降 tag 追加は自動 crawl (`git tag v0.0.1 && git push --tags`)
  ```
- **削除規則**: package の delete は UI から可能 (owner 権限)。**vendor 名は最初の package publish で先取り**、以降は同 vendor での publish は既存 vendor 内 package の maintainer だけ。
- **費用**: 無料 (Private Packagist は有料の別サービス)。
- **空き確認**:
  - vendor: `curl -sI https://packagist.org/packages/kuu/anything` → 全て 404 で reference URL に届く場合、まだ誰も vendor 使ってない (ただし正確には最小 publish で先取り確認する)
  - UI: https://packagist.org/packages/kuu/kuu
- **kuu 押さえ方の推奨**: **`kuu/kuu` (vendor kuu を先取り) を最小 composer.json で publish** することで vendor `kuu` を独占。以後 `kuu/parser` `kuu/spec` 等の追加は自由。
- **出典**:
  - https://packagist.org/about
  - https://seld.be/notes/typo-squatting-and-packagist/

---

## 13. CPAN / PAUSE (Perl) https://pause.perl.org / https://metacpan.org

- **名前空間**: モジュール名 (`Kuu`, `Kuu::Parser`) の階層コロン namespace + distribution 名 (tarball の name)。**モジュール名の階層** (Kuu:: 配下) を先取りできる。
- **squatting 規約**: first-come first-serve。**upload 権限を得るために PAUSE trustees への申請が必要** (spam 防止)。namespace 争いは (1) 現 author 直接交渉 → (2) PAUSE admin 提訴の 2 段。ANDK (Andreas König) が tie-breaker。
- **登録手順**:
  ```bash
  # 1. https://pause.perl.org/pause/query?ACTION=request_id で PAUSE ID 申請
  #    (メール + 目的記入。承認まで数日〜1週間)
  # 2. 承認後、PAUSE admin から uploader 権限付与
  # 3. Perl distribution 作成
  cpanm --look Module::Starter    # 参考ツール
  module-starter --module=Kuu --author="kawaz" --email=...
  cd Kuu
  perl Makefile.PL && make && make test && make dist
  # → Kuu-0.001.tar.gz 生成
  # 4. https://pause.perl.org/pause/authenquery?ACTION=add_uri で upload
  # → 数分〜数時間で MetaCPAN に反映、Kuu::* namespace 先取り
  ```
- **削除規則**: distribution 単位で削除リクエスト可能 (指定期間後に BackPAN に retained)。namespace の再割当は maintenance transfer 手順 (公開スレ + admin メール)。
- **費用**: 無料。
- **空き確認**:
  - `curl -sI https://metacpan.org/pod/Kuu` → 404 なら空
  - 06perms.txt (`https://cpan.metacpan.org/modules/06perms.txt`) で `Kuu,` 行が無ければ未取得
- **kuu 押さえ方の推奨**: Perl コミュニティの慣習では **Kuu という 1 単語トップ namespace の取得は control 権が強い** (Kuu::Parser 等の下層が全部自分の権利)。実装は最小 `sub version { "0.001" }` で足りるが、PAUSE の trustees への申請フェーズがあるので取得までのリードタイムに注意。
- **出典**:
  - https://www.cpan.org/modules/04pause.html
  - https://github.com/andk/pause/blob/master/doc/operating-model.md

---

## 14. Swift Package Registry / Swift Package Index https://swiftpackageindex.com

- **現状 (2026-06 時点)**: **公式 central registry は未確立**。Apple が 2026-06-23 に Swift Package Index (SPI) を acquisition、今後 official registry として package signing / identity を整備予定 (詳細スペック未公開)。現状の SwiftPM は SE-0292 準拠の registry が使えるが、default で使う中央 registry はまだ無い。
- **名前空間 (SwiftPM registry spec)**: `scope.package-name` (例: `kuu.core`)。scope は今後の identity で管理。
- **既存の Swift Package Index (SPI) 掲載**: 「publish」というより「index への掲載申請」。GitHub リポジトリ + `Package.swift` があれば SPI に登録できる。名前 (package name) 自体は Git URL (owner/repo) と Package.swift の name attribute で決まる、レジストリ独立の name 予約はまだ無い。
- **squatting 規約**: レジストリ確立前なので該当規約なし。
- **登録手順 (現状 = SPI 掲載)**:
  ```bash
  # 1. github.com/kawaz/kuu-swift 等に Package.swift を持つリポを作成 (Go と同様、VCS name が実質 identity)
  # 2. semver tag を打つ (git tag 1.0.0 && git push --tags)
  # 3. https://swiftpackageindex.com/add-a-package で GitHub issue template から submission
  # → SPI の compat matrix / doc に掲載
  ```
- **削除規則**: SPI は index、実体は VCS。VCS 削除で index からも消える。
- **費用**: 無料。
- **空き確認**:
  - UI: https://swiftpackageindex.com/kawaz/kuu-swift
  - GitHub 側の owner/repo の空きで判定
- **kuu 押さえ方の推奨**: **今は VCS 名 (github.com/kawaz/kuu または kawaz/kuu-swift) の確保が実質全て**。Apple 公式 registry がリリースされたら scope `kuu` の登録を再検討。**現時点で SwiftPM registry として「kuu を先取り」は無意味**、動向を監視するのが妥当。
- **出典**:
  - https://swiftpackageindex.com/faq
  - https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/usingswiftpackageregistry/

---

## 15. Homebrew https://brew.sh

- **性質**: 中央パッケージレジストリではなく **formula 集約リポ (homebrew-core)** + **third-party tap** の 2 系統。
- **名前の性質**:
  - **homebrew-core の formula 名**: `kuu` は core にマージされない限り予約されない。core への追加は「一定の user base、実体、maintain 意思」等の基準を満たす PR review が必要。
  - **cask 名**: cask は **グローバル一意**が必須 (formula より厳格)。
  - **third-party tap の formula 名**: **tap 内で一意** (`kawaz/tap/kuu`)。core と同名でも tap 経由なら共存可 (ただし `brew install kuu` は core を優先、tap のは `brew install kawaz/tap/kuu` の完全修飾指定)。
- **squatting 規約**: 明示的な squatting 規約なし。ただし homebrew-core は「genuinely useful」「maintained」の acceptable formulae 基準で PR 段階で reject される。
- **登録手順 (自分の tap で kuu formula を公開)**:
  ```bash
  # 1. GitHub に homebrew-tap 命名のリポを作成 (すでに github.com/kawaz/homebrew-tap があるので流用可)
  # 2. Formula/kuu.rb を追加:
  # class Kuu < Formula
  #   desc "kuu specification reference"
  #   homepage "https://github.com/kawaz/kuu"
  #   url "https://github.com/kawaz/kuu/archive/refs/tags/v0.0.1.tar.gz"
  #   sha256 "..."
  #   license "MIT"
  #   def install
  #     bin.install "kuu"
  #   end
  # end
  # 3. commit + push、以後
  brew tap kawaz/tap
  brew install kawaz/tap/kuu
  ```
- **homebrew-core に kuu を通す**:
  - 「安定した実装」「必要性」を満たす PR を出す必要あり
  - 現時点で kuu 実装が spec のみなら core PR は時期尚早
- **費用**: 無料。
- **空き確認**:
  - homebrew-core: `brew info kuu` (エラーなら未登録)、または https://github.com/Homebrew/homebrew-core の Formula/k/kuu.rb 検索
  - UI: https://formulae.brew.sh/formula/kuu
- **kuu 押さえ方の推奨**: **kawaz/tap 内の formula として `kuu` を用意**すれば、実質「kawaz/tap/kuu」が確保される。homebrew-core への追加は実装が成熟してから (現状は不可)。
- **出典**:
  - https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap
  - https://docs.brew.sh/Acceptable-Formulae

---

## 16. LuaRocks (Lua) https://luarocks.org

- **名前空間**: **root manifest が単一フラット namespace** + アカウントごとの personal manifest。root への公開で `luarocks install kuu` が可能に。
- **squatting 規約**: 明示規約なし。first-come 方式。
- **登録手順**:
  ```bash
  # 1. https://luarocks.org でアカウント作成
  # 2. rockspec ファイル作成 (kuu-0.0.1-1.rockspec):
  # package = "kuu"
  # version = "0.0.1-1"
  # source = { url = "git+https://github.com/kawaz/kuu.git", tag = "v0.0.1" }
  # description = { summary = "kuu spec reference", license = "MIT" }
  # dependencies = { "lua >= 5.1" }
  # build = { type = "builtin", modules = { kuu = "src/kuu.lua" } }
  # 3. luarocks upload kuu-0.0.1-1.rockspec --api-key=<KEY>
  # → API key は https://luarocks.org/settings/api-keys で発行
  ```
- **削除規則**: version の非公開・削除は owner が UI から可能。「dev version」は別 manifest に分離 (dev suffix の rockspec)。
- **費用**: 無料。
- **空き確認**:
  - `https://luarocks.org/modules/kuu` が 404 なら root manifest 未登録
- **kuu 押さえ方の推奨**: 最小 rockspec + `src/kuu.lua` に `return { version = "0.0.1" }` 程度で publish。
- **出典**:
  - https://luarocks.org/about
  - https://github.com/luarocks/luarocks/wiki/creating-a-rock

---

## 17. Hackage (Haskell) https://hackage.haskell.org

- **名前空間**: **フラット** (`kuu`)。upload するとその package の maintainer group に自動加入。
- **squatting 規約**: 明示なし。**upload 権限自体が新規アカウントには自動付与されない** (spam 対策)。**hackage-trustees@haskell.org に uploader group への追加を申請**する必要あり (審査あり)。
- **登録手順**:
  ```bash
  # 1. https://hackage.haskell.org/users/register でアカウント作成
  # 2. hackage-trustees@haskell.org へ uploader group 追加を申請 (数日待ち)
  # 3. cabal ファイル
  # name: kuu
  # version: 0.0.1
  # synopsis: kuu specification reference
  # description: Reserved for future Haskell bindings.
  # license: MIT
  # author: kawaz
  # maintainer: ...
  # build-type: Simple
  # cabal-version: >=1.10
  # library
  #   exposed-modules: Kuu
  #   default-language: Haskell2010
  # 4. cabal check && cabal sdist
  # 5. cabal upload dist-newstyle/sdist/kuu-0.0.1.tar.gz
  # → まず candidate として上がる、確定は maintainer が publish 押す
  ```
- **削除規則**: version は基本 immutable。metadata は maintainers/trustees が revise 可能 (version bound の修正等)。abandoned package は Maintainer field を None にして「adoptable」宣言 → 他人が引き取り可能。
- **費用**: 無料 (open source license 必須)。
- **空き確認**:
  - `curl -sI https://hackage.haskell.org/package/kuu` → 404 なら空
  - UI: https://hackage.haskell.org/package/kuu
- **kuu 押さえ方の推奨**: **uploader 権限の取得に時間がかかる** ため早めに申請。「実体のある genuine な package」を積んで PVP に沿った semver (Haskell 独自 4-tuple 版) を書く。
- **出典**:
  - https://hackage.haskell.org/upload
  - https://wiki.haskell.org/Taking_over_a_package

---

## 18. opam (OCaml) https://opam.ocaml.org

- **性質**: **curated PR ベース**。opam-repository (github.com/ocaml/opam-repository) に PR を出し、maintainer team が human review する。
- **名前空間**: フラット `kuu`。ただし PR review 時に「confusing 名」「有用性なし」等で却下される可能性あり。
- **squatting 規約**: 「substantial value」「security/confusion 回避の名前」「maintenance 意思」等の curation policy で、実質 squatting は通らない。放置 package は `opam-repository-archive` へ移動 (削除ではなく archive)。
- **登録手順**:
  ```bash
  # 1. github.com/kawaz/kuu-ocaml に kuu.opam を持つリポを作成
  # 2. semver tag 打ち (git tag v0.0.1 && git push --tags)
  # 3. dune-release (推奨) 又は opam-publish を使って PR を自動生成
  opam install dune-release
  dune-release      # → opam-repository への PR を作成
  # 4. PR で CI (複数 OCaml バージョン compat 検査、依存側 破壊確認、逆依存 build 確認) をパス
  # 5. maintainer review 通過後 merge → https://opam.ocaml.org/packages/kuu/ に表示
  ```
- **削除規則**: 一度 merge された version は immutable (git 履歴として残る)。abandoned は archive リポへ移動。
- **費用**: 無料。
- **空き確認**:
  - `curl -sI https://opam.ocaml.org/packages/kuu/` → 404 なら空
  - GitHub: https://github.com/ocaml/opam-repository/tree/master/packages/kuu (無ければ空)
- **kuu 押さえ方の推奨**: opam は **PR review で「substantial value」を求められる**。空 stub の PR は却下されうる、実装が spec の実装として説明できるまで待つのが安全。**急ぐなら「future OCaml bindings placeholder」の PR を出しても reject リスクを許容する**が、通常は他レジストリと違って先取り目的は難しい。
- **出典**:
  - https://opam.ocaml.org/doc/Packaging.html
  - https://github.com/ocaml/opam-repository/wiki/Policies

---

## 19. Nimble (Nim) https://nimble.directory

- **性質**: `nim-lang/packages` の `packages.json` に PR を出す方式 (Nim 版 opam-repository)。
- **名前空間**: フラット。README で「overly generic な名前は避けろ」と明示 (`math`, `http` 例)。
- **squatting 規約**: 明示なし。ただし「URL が動かない」「license 無し」等の non-compliant は無警告削除あり。「abandoned」タグ推奨。
- **登録手順**:
  ```bash
  # 1. github.com/kawaz/kuu (or kuu-nim) に kuu.nimble ファイルを置く:
  # version = "0.0.1"
  # author = "kawaz"
  # description = "kuu specification reference"
  # license = "MIT"
  # srcDir = "src"
  # 2. git tag v0.0.1 && git push --tags
  # 3. 手動 PR (nim-lang/packages の packages.json に entry 追加) or nimble publish (GitHub token 使用)
  nimble publish
  ```
- **削除規則**: URL 死亡で削除、rename は「新 entry 追加」で行う。
- **費用**: 無料。
- **空き確認**:
  - `curl -s https://raw.githubusercontent.com/nim-lang/packages/master/packages.json | jq '.[] | select(.name=="kuu")'` → 空なら未登録
  - UI: https://nimble.directory/pkg/kuu
- **kuu 押さえ方の推奨**: `packages.json` PR + genuine な kuu.nimble で成立。generic 名警告に触れるが `kuu` 自体は spec 名なので用途明示すれば OK。
- **出典**:
  - https://github.com/nim-lang/packages
  - https://nim-lang.github.io/nimble/create-packages.html

---

## 20. Zig (公式レジストリなし) https://ziglang.org

- **性質**: **中央レジストリ無し**。Zig 0.11 (2023-08) 以降 build.zig.zon で URL 直指定の分散型パッケージ管理。community index (Zigistry, zigpkg.dev 等) は非公式。
- **名前空間**: 各リポの URL がそのまま identity。`kuu` の予約という概念は存在しない。
- **squatting 規約**: 該当なし (公式レジストリ不在)。
- **登録手順**:
  ```bash
  # 1. github.com/kawaz/kuu-zig (or kawaz/kuu 兼用) に build.zig / build.zig.zon を用意
  # 2. semver tag 打ち
  # 3. 消費者側は zig fetch --save git+https://github.com/kawaz/kuu-zig#v0.0.1 で取得
  # 4. コミュニティ index (Zigistry 等) に登録したければ各サイトの手順に従う
  ```
- **削除規則**: VCS 側次第。
- **費用**: 無料。
- **空き確認**: 現状で公式意味の「空き」は無し。GitHub owner/repo で判定。
- **kuu 押さえ方の推奨**: **今は特別なアクションなし**。github.com/kawaz/kuu が既にあれば実質確保済み。将来 Zig 公式 registry が立ち上がったら再アセスメント。
- **出典**:
  - https://ziglang.org/learn/getting-started/
  - https://nesbitt.io/2026/01/29/zig-and-the-mxn-supply-chain-problem.html

---

## 21. その他 補足レジストリ (簡易)

以下は依頼一覧に含まれないが「kuu」の総合ブランド確保として考慮の余地あり:

- **conda-forge** (Python / 多言語): conda-forge/staged-recipes に PR を出す curation 方式。recipe review 有り。namespace は `conda-forge::kuu`。https://conda-forge.org
- **Arch AUR** (Arch Linux community): user が PKGBUILD を投稿、name は AUR 内フラット。https://aur.archlinux.org
- **crates.io の兄弟 lib.rs** (Rust): 独立レジストリではなく crates.io の別 UI。crates.io 確保で足りる。
- **Elm packages**: `elm publish` で GitHub リポ + semver tag からインデックス。名前は `<github-user>/<repo>`。
- **Julia General**: General.jl registry に PR、UUID + name。
- **Cargo alternate registries** (private): sccache 等の enterprise 用。個人 kuu 確保には無関係。

---

## 押さえるべき優先順位 (kawaz/kuu 用の recommend)

**Tier S (必須、実装存在で先取り確定できる、少コスト)**:
1. **mooncakes.io** (`kawaz/kuu`) — 参照実装言語なので必須、GitHub username namespace で構造的に他者奪取不可
2. **crates.io** (`kuu`) — フラット & squatting 明示禁止のため 「genuine な最小 Rust 実装」を急ぎ publish
3. **PyPI** (`kuu`) — PEP 541、squatting 判定を避けるため用途明示 + minimum lib
4. **npm** (`@kuu/*` org 確保 + `kuu` 実装) — フラット `kuu` はリスクあり、`@kuu` scope が安全
5. **JSR** (`@kuu`) — scope 制なので構造的に確保が正規
6. **RubyGems** (`kuu`) — description に「reservation」を明記すれば safe

**Tier A (中央レジストリで確保価値あり、squatting 弱め)**:
7. **NuGet** (`kuu` + `Kuu.*` prefix 予約 mail 申請) — フラット + prefix reservation の 2 段
8. **Packagist** (`kuu/kuu`) — vendor `kuu` を先取り、以後 `kuu/*` 独占
9. **pub.dev** (`kuu`) — unpublish 実質不可なので永続確保
10. **Hex.pm** (`kuu`) — Elixir/Erlang 領域

**Tier B (時間・審査要、実装成熟後)**:
11. **CPAN** — PAUSE trustee 申請、審査あり
12. **Hackage** — uploader 権限申請、審査あり
13. **Maven Central** (`io.github.kawaz`) — GitHub 経由なら自動 verify、DNS 保有なら独自 groupId
14. **opam** — curation PR、substantial value 要求で先取り困難
15. **LuaRocks** / **Nimble** — publish 手順は軽いが利用者少ない

**Tier C (レジストリ登録の概念なし = VCS 側で確保済み)**:
16. **Go / pkg.go.dev** — github.com/kawaz/kuu の tag 打ちだけ
17. **Swift Package Registry** — 未確立、様子見
18. **Zig** — 公式無し、様子見

**Tier D (中央レジストリでない)**:
19. **Homebrew** — kawaz/homebrew-tap 内の Formula/kuu.rb で確保

---

## 一括空き確認スクリプト (参考)

```bash
#!/usr/bin/env bash
# 各レジストリの kuu 空き確認 (200 = 既に取られている, 404 = 空)

check() { printf "%-15s: %s\n" "$1" "$(curl -sI -o /dev/null -w '%{http_code}' "$2")"; }

check "npmjs"      "https://registry.npmjs.org/kuu"
check "npm/@kuu"   "https://www.npmjs.com/settings/kuu"
check "crates.io"  "https://crates.io/api/v1/crates/kuu"
check "PyPI"       "https://pypi.org/pypi/kuu/json"
check "RubyGems"   "https://rubygems.org/api/v1/gems/kuu.json"
check "NuGet"      "https://api.nuget.org/v3-flatcontainer/kuu/index.json"
check "Hex.pm"     "https://hex.pm/api/packages/kuu"
check "Packagist"  "https://packagist.org/packages/kuu/kuu"
check "pub.dev"    "https://pub.dev/api/packages/kuu"
check "JSR"        "https://jsr.io/@kuu/meta.json"
check "mooncakes"  "https://mooncakes.io/docs/kawaz/kuu"
check "MetaCPAN"   "https://metacpan.org/pod/Kuu"
check "Hackage"    "https://hackage.haskell.org/package/kuu"
check "opam"       "https://opam.ocaml.org/packages/kuu/"
check "LuaRocks"   "https://luarocks.org/modules/kuu"
check "Nimble"     "https://nimble.directory/pkg/kuu"
check "pkg.go.dev" "https://pkg.go.dev/github.com/kawaz/kuu"
check "SPI"        "https://swiftpackageindex.com/kawaz/kuu"
check "Homebrew"   "https://formulae.brew.sh/formula/kuu"
```

---

## 全体観の要点 (誤って空 stub を撒かないための注意)

- **crates.io / RubyGems / PyPI** は squatting 明示禁止 (or 事実上禁止)。「reserved for future」だけの空 v0.0.1 を publish すると **community 通報 → 削除** リスクあり。description に用途 (spec 参照実装の言語バインディング placeholder) を明記し、最低限の genuine な API (`fn version()`, `def version()` 等) を用意する。
- **npm** はフラット `kuu` を先取りしても方針上は削除されにくいが、trademark holder が現れたら移転される。**`@kuu` scope + org 確保**の方が構造的に安全。
- **Packagist** は vendor 名先取りが強力 (`kuu/*` 全部押さえられる)。
- **mooncakes.io / JSR** は namespace 構造で他者奪取が構造的に不可能、最も安全。
- **Go / Zig / Swift** は VCS 名 = 名前、GitHub 側で kawaz/kuu を持っていれば先取り確定。
- **Hackage / CPAN** は uploader 権限申請フェーズがあるので早めに動く。
- **opam** は substantial value 要求で先取り困難、実装成熟を待つ判断。

## 前提: kuu の実装形態と各レジストリでの stub のあり方

kuu の正体は **spec** (moon 実装が現時点で唯一の参照実装)。他言語での実装は placeholder。以下いずれかを最小 unit として置くと safe:

- README.md に「kuu specification の <言語> 参照実装 (WIP)。spec repository: https://github.com/kawaz/kuu」を書く
- 各言語の慣習に沿った LICENSE ファイル
- 1 export (関数・定数) で version 情報を返す (e.g. `pub fn version() -> &'static str { "0.0.1" }`)
- 一切実行するとエラーになる parser stub は避ける (「genuine な機能ゼロ」の指摘を招く)。「まだ parse できない」旨の informative error を返すなら OK

