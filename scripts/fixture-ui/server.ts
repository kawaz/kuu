/**
 * conformance fixture 監査 WebUI のサーバ。
 *
 * ビルド step は持たない。index.html を import すると bun が TS/CSS ごと
 * バンドルして配信するため、`bun run server.ts` だけで起動する。
 *
 * fixture も help も「都度読む / 都度生成する」。fixture を編集したら
 * ブラウザをリロードするだけで反映される (事前生成による同期ずれを作らない)。
 */
import { resolve, sep } from "node:path";
import index from "./index.html";
import { QUERY_KINDS } from "./src/types.ts";
import type { Fixture, FixtureIndex, FixtureSummary, HelpResult } from "./src/types.ts";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const FIXTURES_ROOT = resolve(REPO_ROOT, "fixtures");

/**
 * help レンダリングに使う kuu-cli バイナリ。
 * 既定は kawaz の repos レイアウト上の兄弟チェックアウト。別の場所に置いて
 * いる場合は KUU_CLI_BIN で上書きする。
 */
const KUU_CLI_BIN =
  process.env.KUU_CLI_BIN ??
  resolve(
    REPO_ROOT,
    "../../kuu-cli/main/impl/mbt/_build/native/debug/build/kawaz/kuu-cli-mbt/main/main.exe",
  );

const BUILD_HINT = [
  `kuu-cli バイナリが見つかりません: ${KUU_CLI_BIN}`,
  "",
  "ビルド (kuu-cli リポで):",
  "  just generate-self-definition && moon build --target native",
  "",
  "別の場所に置いている場合は KUU_CLI_BIN=<path> just fixture-ui で指定する。",
].join("\n");

/** fixtures/ の外を指す path を弾く。 */
function resolveFixturePath(relative: string | null): string | null {
  if (!relative || !relative.endsWith(".json")) return null;
  const full = resolve(FIXTURES_ROOT, relative);
  if (!full.startsWith(FIXTURES_ROOT + sep)) return null;
  return full;
}

async function readFixture(relative: string): Promise<Fixture> {
  const full = resolveFixturePath(relative);
  if (!full) throw new Error(`fixtures/ の外を指しています: ${relative}`);
  return (await Bun.file(full).json()) as Fixture;
}

async function buildIndex(): Promise<FixtureIndex> {
  const fixtures: FixtureSummary[] = [];
  const errors: { path: string; reason: string }[] = [];
  const glob = new Bun.Glob("**/*.json");

  const relatives: string[] = [];
  for await (const relative of glob.scan({ cwd: FIXTURES_ROOT })) relatives.push(relative);
  relatives.sort();

  await Promise.all(
    relatives.map(async (relative, i) => {
      try {
        const fixture = (await Bun.file(resolve(FIXTURES_ROOT, relative)).json()) as Fixture;
        const query = fixture.query;
        if (!QUERY_KINDS.includes(query)) {
          errors.push({ path: relative, reason: `未知の query: ${JSON.stringify(query)}` });
          return;
        }
        fixtures[i] = {
          path: relative,
          query,
          why: typeof fixture.why === "string" ? fixture.why : "",
          caseIds: (fixture.cases ?? []).map((c) => c.id),
        };
      } catch (e) {
        errors.push({ path: relative, reason: e instanceof Error ? e.message : String(e) });
      }
    }),
  );

  return { fixtures: fixtures.filter(Boolean), errors };
}

/** fixture の category_mode 値を kuu-cli の --category-mode 引数へ写す。 */
function categoryModeArg(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "named" in value) {
    const named = (value as { named: unknown }).named;
    if (typeof named === "string") return `named:${named}`;
  }
  return null;
}

/**
 * fixture の definition を kuu-cli に渡して help テキストを得る。
 * envelope ごと渡すと `unsupported key 'why'` になるので definition だけを stdin へ流す。
 * case を指定すると、その case の path / depth / category_mode を反映した help を出す。
 */
async function renderHelp(relative: string, caseId: string | null): Promise<HelpResult> {
  const fixture = await readFixture(relative);
  const args = ["help", "-", "--format", "text"];

  if (caseId !== null) {
    const target = (fixture.cases ?? []).find((c) => c.id === caseId);
    if (!target) {
      return { ok: false, reason: `case が見つかりません: ${caseId}`, command: "" };
    }
    if (Array.isArray(target.path)) args.push("--path", JSON.stringify(target.path));
    if (typeof target.depth === "string") args.push("--depth", target.depth);
    const mode = categoryModeArg(target.category_mode);
    if (mode !== null) args.push("--category-mode", mode);
  }

  const command = `kuu ${args.join(" ")}  # stdin: .definition`;

  if (!(await Bun.file(KUU_CLI_BIN).exists())) {
    return { ok: false, reason: BUILD_HINT, command };
  }

  const proc = Bun.spawn([KUU_CLI_BIN, ...args], {
    stdin: new TextEncoder().encode(JSON.stringify(fixture.definition)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    const detail = [stdout, stderr].filter((s) => s.trim()).join("\n").trim();
    return {
      ok: false,
      reason: detail || `kuu-cli が exit ${code} で終了しました (出力なし)`,
      command,
    };
  }
  return { ok: true, text: stdout, command };
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 5757),
  development: true,
  routes: {
    "/": index,

    "/api/fixtures": async () => Response.json(await buildIndex()),

    "/api/fixture": async (req) => {
      const relative = new URL(req.url).searchParams.get("path");
      if (!resolveFixturePath(relative)) return jsonError(`不正な path: ${relative}`, 400);
      try {
        return Response.json(await readFixture(relative!));
      } catch (e) {
        return jsonError(e instanceof Error ? e.message : String(e), 404);
      }
    },

    "/api/help": async (req) => {
      const params = new URL(req.url).searchParams;
      const relative = params.get("path");
      if (!resolveFixturePath(relative)) return jsonError(`不正な path: ${relative}`, 400);
      try {
        return Response.json(await renderHelp(relative!, params.get("case")));
      } catch (e) {
        return jsonError(e instanceof Error ? e.message : String(e), 404);
      }
    },
  },
});

console.log(`fixture-ui: ${server.url}`);
console.log(`  fixtures: ${FIXTURES_ROOT}`);
console.log(`  kuu-cli : ${KUU_CLI_BIN}${(await Bun.file(KUU_CLI_BIN).exists()) ? "" : "  (未ビルド — help は表示できません)"}`);
