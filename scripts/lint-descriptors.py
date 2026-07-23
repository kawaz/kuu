#!/usr/bin/env python3
"""schema/builtin-descriptors.json の集合レベル整合性を検査する。

schema/descriptor.schema.json は単一 descriptor と envelope (filters/cell_fns/
types/accumulators/completers/providers の 6 区分マップ) の両方を検証できるが、JSON Schema の表現範囲外の
semantic 制約 (map key と descriptor.name の一致、output_mode:"preserve" の
io_type.input == io_type.output、observes template の parameter 存在照合) は本スクリプトが machine-check する
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


def parameter_names(nodes: list[object]) -> set[str]:
    names: set[str] = set()
    for node in nodes:
        if not isinstance(node, dict):
            continue
        name = node.get("name")
        if isinstance(name, str):
            names.add(name)
            continue
        for branch in ("seq", "or"):
            children = node.get(branch)
            if isinstance(children, list):
                names.update(parameter_names(children))
        repeat = node.get("repeat")
        if isinstance(repeat, dict) and "node" in repeat:
            names.update(parameter_names([repeat["node"]]))
    return names


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text())
    data = json.loads(DATA_PATH.read_text())

    ok = True

    # 1. envelope 検証 (filters/cell_fns/types/accumulators/completers/providers の集合形状
    #    + 各 descriptor の role 別条件分岐、DR-107 §7 / DR-114 §8 / DR-117 §7)
    resolver = jsonschema.validators.RefResolver.from_schema(schema)
    envelope_schema = schema["$defs"]["envelope"]
    validator = jsonschema.Draft202012Validator(envelope_schema, resolver=resolver)
    errors = list(validator.iter_errors(data))
    if errors:
        ok = False
        for e in errors:
            fail(f"envelope: {'/'.join(str(p) for p in e.path)}: {e.message}")
    else:
        print("[OK]   envelope shape (filters/cell_fns/types/accumulators/completers/providers, role 別条件分岐)")

    # 2. map key と descriptor.name の一致。registry が異なれば同じ bare name は
    #    合法 (DR-114 §8) なので重複検査は section 内に閉じる。
    sections = ("filters", "cell_fns", "types", "accumulators", "completers", "providers")
    key_mismatches = []
    descriptor_count = 0
    for section in sections:
        section_names: dict[str, str] = {}
        for key, desc in data.get(section, {}).items():
            descriptor_count += 1
            name = desc.get("name")
            if name != key:
                key_mismatches.append(f"{section}.{key}: name={name!r} (key と不一致)")
            if name in section_names:
                key_mismatches.append(
                    f"{section}.{key}: name={name!r} は {section_names[name]} と重複"
                )
            else:
                section_names[name] = f"{section}.{key}"
    if key_mismatches:
        ok = False
        for m in key_mismatches:
            fail(f"key/name consistency: {m}")
    else:
        print(f"[OK]   key/name consistency ({descriptor_count} 件)")

    # 3. output_mode:"preserve" ⇒ io_type.input == io_type.output (DR-107 §4 が
    #    Schema では表現しないと明記、semantic lint の検査対象)
    preserve_mismatches = []
    for section in sections:
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

    # 4. observes の <parameter> template は同じ descriptor の
    #    invocation.parameters 内に実在しなければならない (DR-114 §10)。
    observes_mismatches = []
    for section in ("filters", "cell_fns"):
        for key, desc in data.get(section, {}).items():
            params = desc.get("invocation", {}).get("parameters", [])
            names = parameter_names(params)
            for observation in desc.get("observes", []):
                _, _, target = observation.partition(":")
                if "<" not in target and ">" not in target:
                    continue
                if not (target.startswith("<") and target.endswith(">")):
                    observes_mismatches.append(
                        f"{section}.{key}: malformed observes template {observation!r}"
                    )
                    continue
                parameter = target[1:-1]
                if parameter not in names:
                    observes_mismatches.append(
                        f"{section}.{key}: observes template {observation!r} は "
                        f"未定義 parameter {parameter!r} を参照"
                    )
    if observes_mismatches:
        ok = False
        for m in observes_mismatches:
            fail(f"observes template: {m}")
    else:
        print("[OK]   observes templates reference declared invocation parameters")

    print()
    if not ok:
        print("lint-descriptors: FAIL")
        return 1
    print("lint-descriptors: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
