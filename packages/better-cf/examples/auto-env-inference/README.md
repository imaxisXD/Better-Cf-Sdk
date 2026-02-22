# auto-env-inference

Demonstrates default `createSDK()` mode without manually declaring `type Env`.

`better-cf generate/dev/deploy` writes `.better-cf/auto-env.d.ts` so `ctx.env` gets inferred bindings.
