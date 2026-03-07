---
"better-cf": major
---

Refactor CLI to a Fuma-style stack and remove queue/subscription admin wrappers.

- remove `queue:*` and `subscription:*` commands from `better-cf`
- add nested utility commands: `registry list|info|add|cache clear`, `tree`
- switch `create` package manager flags to `--package-manager <npm|pnpm|yarn|bun>`
- migrate CLI AST parsing to `oxc-parser`
- migrate CLI subprocess handling to `tinyexec`
