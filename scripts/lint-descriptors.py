#!/usr/bin/env python3
"""schema/builtin-descriptors.json の集合レベル整合性を検査する。

schema/descriptor.schema.json は単一 descriptor と envelope (filters/types/
providers の 3 区分マップ) の両方を検証できるが、JSON Schema の表現範囲外の
semantic 制約 (map key と descriptor.name の一致、output_mode:"preserve" の
io_type.input == io_type.output 不変量) は本スクリプトが machine-check する
(codex レビュー #4 A-M11/B-Maj6 が指摘した「envelope 自体を検証する形が無い」
の是正、DR-107 §4 が「semantic lint の検査対象」と位置づけた preserve 不変量
の実装)。

依存: jsonschema (uv run --with jsonschema 経由で解決、justfile の
lint-descriptors task を参照)。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schema" / "descriptor.schema.json"
DATA_PATH = ROOT / "schema" / "builtin-descriptors.json"


def fail(msg: str) -> None:
    print(f"[FAIL] {msg}")


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text())
    data = json.loads(DATA_PATH.read_text())

    ok = True

    # 1. envelope 検証 (filters/types/providers の集合形状 + 各 descriptor の
    #    role 別条件分岐、DR-107 §7)
    resolver = jsonschema.validators.RefResolver.from_schema(schema)
    envelope_schema = schema["$defs"]["envelope"]
    validator = jsonschema.Draft202012Validator(envelope_schema, resolver=resolver)
    errors = list(validator.iter_errors(data))
    if errors:
        ok = False
        for e in errors:
            fail(f"envelope: {'/'.join(str(p) for p in e.path)}: {e.message}")
    else:
        print("[OK]   envelope shape (filters/types/providers, role 別条件分岐)")

    # 2. map key と descriptor.name の一致 (codex レビュー #4 A-M7(3)/A-M11/B-Maj6)
    key_mismatches = []
    seen_names: dict[str, str] = {}
    for section in ("filters", "types", "providers"):
        for key, desc in data.get(section, {}).items():
            name = desc.get("name")
            if name != key:
                key_mismatches.append(f"{section}.{key}: name={name!r} (key と不一致)")
            # canonical ID 重複検査 (bare/ns 付きを問わず name の重複を検出)
            loc = f"{section}.{key}"
            if name in seen_names:
                key_mismatches.append(
                    f"{loc}: name={name!r} は {seen_names[name]} と重複"
                )
            else:
                seen_names[name] = loc
    if key_mismatches:
        ok = False
        for m in key_mismatches:
            fail(f"key/name consistency: {m}")
    else:
        print(f"[OK]   key/name consistency ({len(seen_names)} 件)")

    # 3. output_mode:"preserve" ⇒ io_type.input == io_type.output (DR-107 §4 が
    #    Schema では表現しないと明記、semantic lint の検査対象)
    preserve_mismatches = []
    for section in ("filters", "types", "providers"):
        for key, desc in data.get(section, {}).items():
            if desc.get("output_mode") != "preserve":
                continue
            io_type = desc.get("io_type")
            if not io_type:
                continue
            if io_type.get("input") != io_type.get("output"):
                preserve_mismatches.append(
                    f"{section}.{key}: output_mode=preserve だが "
                    f"io_type.input={io_type.get('input')!r} != "
                    f"io_type.output={io_type.get('output')!r}"
                )
    if preserve_mismatches:
        ok = False
        for m in preserve_mismatches:
            fail(f"output_mode:preserve invariant: {m}")
    else:
        print("[OK]   output_mode:preserve ⇒ io_type.input == io_type.output")

    print()
    if not ok:
        print("lint-descriptors: FAIL")
        return 1
    print("lint-descriptors: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
