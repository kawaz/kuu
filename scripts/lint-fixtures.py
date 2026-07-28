#!/usr/bin/env python3
"""fixtures/ 配下の全 conformance fixture が schema/fixture.schema.json に適合するか検査する。

fixture は conformance の期待値そのもの (CONFORMANCE §1-5、DR-065 §1) であり、
schema 違反の fixture は runner 側で初めて落ちる。push 前に spec リポ単体で
検出できるよう常設 gate 化した (issue 2026-07-28-fixture-schema-validation-gate)。

fixture.schema.json は definition 部を wire.schema.json#/$defs/node へ委譲する
(DR-063 の宣言層 wire form)。ネットワーク解決を避けるため、2 つの schema を
ローカル registry へ登録して相対 $ref を解決する。

検査するのは構文層のみ (DR-067 §1) — 語彙層 (descriptor 所有集合) と参照層
(ref/link/type の解決・循環) は Schema の表現力の外であり parse_definition の
関心。期待値の妥当性 (取り分・エラー帰属等) も本 lint の対象外。

依存: jsonschema (uv run --with jsonschema 経由で解決、justfile の
lint-fixtures task を参照)。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import jsonschema
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "schema"
FIXTURE_DIR = ROOT / "fixtures"

FIXTURE_SCHEMA = "fixture.schema.json"
WIRE_SCHEMA = "wire.schema.json"


def fail(msg: str) -> None:
    print(f"[FAIL] {msg}")


def build_validator() -> jsonschema.Draft202012Validator:
    """2 schema をローカル registry に載せ、相対 $ref を解決する validator を返す。

    registry に retrieve を与えないので、登録外の URI を指す $ref は
    ネットワークを引かずに Unresolvable で落ちる (schema 側の書き損じの検出)。
    """
    contents = {
        name: json.loads((SCHEMA_DIR / name).read_text())
        for name in (FIXTURE_SCHEMA, WIRE_SCHEMA)
    }
    registry = Registry().with_resources(
        (name, Resource.from_contents(schema)) for name, schema in contents.items()
    )
    return jsonschema.Draft202012Validator(contents[FIXTURE_SCHEMA], registry=registry)


def main() -> int:
    if not FIXTURE_DIR.is_dir():
        fail(f"{FIXTURE_DIR.relative_to(ROOT)} が存在しません")
        return 1

    validator = build_validator()
    targets = sorted(FIXTURE_DIR.rglob("*.json"))
    if not targets:
        fail(f"{FIXTURE_DIR.relative_to(ROOT)} に fixture がありません")
        return 1

    ok = True
    for path in targets:
        rel = path.relative_to(ROOT)
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            ok = False
            fail(f"{rel}: JSON として読めません: {exc}")
            continue
        for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
            ok = False
            loc = "/".join(str(p) for p in err.path)
            fail(f"{rel}: /{loc}: {err.message}")

    if ok:
        print(f"[OK]   fixture schema 適合 ({len(targets)} 件)")

    print()
    if not ok:
        print("lint-fixtures: FAIL")
        return 1
    print("lint-fixtures: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
