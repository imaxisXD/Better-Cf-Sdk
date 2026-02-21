---
title: IA Benchmark (Next.js App Router)
description: Internal benchmark notes for the queue-first docs information architecture update.
---

This internal note captures why the current docs IA was reorganized using Next.js App Router docs patterns as a benchmark.

## Benchmark Goal

Adopt a docs flow that helps new adopters reach first success quickly, then graduate into deeper operational and architecture references without navigation friction.

## What Was Benchmarked

- progression model: onboarding -> guides -> API reference -> architecture
- sidebar discoverability for high-level product context vs package-specific depth
- page language style: task-first procedural writing with explicit outcomes

## Gap Summary Before Rewrite

- quickstart carried too much detail and mixed onboarding with deeper guidance
- guide taxonomy was broad but under-segmented for common queue tasks
- architecture concepts existed but were not grouped as a clear learning lane
- suite-level pages could disappear from queue docs context due to hard filtering

## IA Decisions Taken

- keep URLs stable for existing pages and add new pages for missing task pathways
- split Queue docs into Getting Started, Guides, Operations, API Reference, Architecture, and Examples & Comparison
- keep a visible context switch between Suite and Queue SDK in sidebar behavior
- standardize procedural page contract for new/reworked pages

## Acceptance Checks

- `npm run docs:build` passes
- `npm run check:docs` passes with required page inventory
- core path from quickstart to deploy-relevant guidance stays within a small click depth
