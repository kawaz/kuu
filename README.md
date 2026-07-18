# kuu

> English | [日本語](./README-ja.md)

A language-agnostic **specification** for CLI argument definitions, with a conformance suite.

The core of kuu is not a binary in any particular language — it is the **spec + API contract + conformance fixtures** (a language-neutral test-data corpus). Each language gets a native implementation of this core; [kuu.mbt](https://github.com/kawaz/kuu.mbt) is the reference implementation, and [kuu-cli](https://github.com/kawaz/kuu-cli) is a standalone CLI frontend.

## What it looks like

A CLI is defined as a JSON document (the *wire form*), and any conforming implementation parses argv against it with identical observable behavior:

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

Definitions cover long/short options, subcommands, positionals, repetition, value sources (CLI / env / config files / tty), constraints, aliases, completion and help — all specified declaratively, all pinned by conformance fixtures.

## Layout

| Path | Contents |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | The single source of truth for the current spec (AST, parsing semantics, API contract) |
| [docs/LOWERING.md](docs/LOWERING.md) | Canonical catalog of syntactic-sugar expansions |
| [docs/CONFORMANCE.md](docs/CONFORMANCE.md) | Conformance fixture format and comparison rules |
| [fixtures/](fixtures/) | The conformance fixture corpus |
| [schema/](schema/) | JSON Schemas for the wire form and descriptors |
| [docs/decisions/](docs/decisions/INDEX.md) | Design Records — the rationale (and rejected alternatives) behind every design decision |

Most in-repo documentation is currently written in Japanese while the spec is under heavy iteration; the spec itself is defined by the documents and fixtures above.

## Status

Draft. The spec is largely settled through co-design with the reference implementation, and breaking changes are still allowed across the board. Version 1.0.0 will be published once all conformance profiles are green on the reference implementation.

## License

[MIT](LICENSE) © Yoshiaki Kawazu
