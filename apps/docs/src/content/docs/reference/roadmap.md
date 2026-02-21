---
title: Roadmap
description: Directional roadmap for the better-cf SDK suite and current SDK maturity status.
---

This roadmap is directional, not a release contract.

## SDK Status Snapshot

- `better-cf/queue`: **Alpha**
- `better-cf/workflow`: **Coming Soon**
- `better-cf/durable-object`: **Coming Soon**

## Current Focus (Queue SDK Alpha)

- stabilize queue DX and scanner reliability
- expand docs with source-backed production patterns
- keep generated wiring predictable across supported Wrangler configs
- tighten migration ergonomics for teams moving from manual queue setups

## Planned Progression

Queue SDK is intentionally labeled Alpha while core ergonomics and edge cases are hardened.

As stability and coverage improve, this will progress to Beta and then stable release criteria.

## Reserved Future Namespaces

- `better-cf/workflow`
- `better-cf/durable-object`

## Principles for Future Additions

- opinionated defaults first
- preserve direct Cloudflare escape hatches
- prioritize maintainable DX over thin wrapper sprawl
- keep package APIs composable and type-first

## What Is Not Implied

Reserved namespaces do not imply immediate availability or timeline guarantees.
