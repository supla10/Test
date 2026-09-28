# Loopnow CPA Copilot

Production-oriented Canadian bookkeeping copilot prototype with deterministic CRA/GIFI rules, visible agent tool activity, human review, and audit history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional env: see `.env.example`; the deterministic demo does not require an API key.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/loopnow-cpa-copilot/` — React/Vite dashboard.
- `artifacts/api-server/src/domain/copilot.ts` — receipt models, deterministic CRA rules, GIFI catalogue validation, processing orchestration, persistence, and audit events.
- `artifacts/api-server/src/routes/copilot.ts` — typed API routes.
- `lib/api-spec/openapi.yaml` — API source of truth; generated hooks live in `lib/api-client-react`.
- `docs/architecture.md` and `docs/threat-model.md` — architecture and security decisions.
- `evaluation/golden-cases.json` — deterministic evaluation scenarios.

## Architecture decisions

- The frontend consumes generated OpenAPI/React Query hooks rather than hand-written client types.
- The prototype defaults to deterministic processing so the safety-critical demo is reproducible without a model key.
- Receipt text is untrusted data; missing documentation and ambiguous classifications route to review with zero finalized ITC.
- JSON persistence is isolated behind the domain store so it can move to PostgreSQL transactions without changing the UI contract.

## Product

The dashboard lets an accounting user select a receipt, ask the copilot to process the selected item, observe each compliance/bookkeeping tool call, inspect the final classification and eligible ITC, approve or reject review cases, and review the audit trail.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
