# Loopnow CPA Copilot

Loopnow CPA Copilot is a production-oriented prototype for Canadian bookkeeping teams. It processes a selected expense or receipt through an app-aware tool loop, keeps CRA and GIFI decisions deterministic, exposes each tool call, routes ambiguous cases to review, and records an audit trail.

> This prototype is bookkeeping automation, not professional tax advice. Decisions are based on the configured ruleset and the information available in the receipt. It does not prove that a GST/HST number is registered with CRA, and it does not claim that CRA will accept a particular filing position.

## Product Overview

The dashboard includes:

- A queue of realistic mock receipts, including office supplies, a business meal, missing GST/HST documentation, a cash deposit, and a prompt-injection receipt.
- App-aware processing: “Process this one” uses the receipt currently selected in the queue.
- A deterministic multi-step agent run: read state, validate documentation, validate tax number format, classify, calculate eligible ITC, validate GIFI, and persist the result.
- A visible run timeline with structured tools, result details, review states, and latency metrics.
- Human approval for cases that need review.
- Persistent JSON state for this assessment prototype. The storage boundary is isolated so it can be replaced with PostgreSQL without changing the rules engine or UI contract.

## Architecture

```text
React + Vite dashboard
        │ typed OpenAPI hooks
        ▼
Express API (/api)
        │
        ├── agent/process orchestrator
        ├── strict Zod request/response validation
        ├── deterministic CRA + GIFI domain rules
        ├── idempotent state mutation
        └── JSON persistence + audit trail
```

The request body is validated at the API boundary. The agent orchestrator is intentionally explicit rather than a single prompt. A future model provider can be added to propose classifications, but the backend must still validate every proposal against the catalogue and rules engine.

## Technology Stack

- React, Vite, TypeScript, Tailwind CSS
- Express 5 API server
- OpenAPI 3.1 as the API contract
- Orval-generated React Query hooks and Zod schemas
- Strict TypeScript configuration
- JSON persistence for the assessment prototype

## Agent Architecture

The current prototype uses a deterministic planner so the demo is reproducible and does not need an API key. The planner has the same seam a model provider would use: it can interpret receipt text and select tools, while tax arithmetic, validation, GIFI lookup, persistence, authorization, and audit events stay server-owned.

The processing order is:

1. `get_current_receipt`
2. `get_receipt_details`
3. `validate_gst_hst_number_format`
4. `validate_cra_documentation`
5. `classify_expense`
6. `calculate_eligible_itc`
7. `assign_gifi_code`
8. `update_expense_classification` or `request_human_review`

Every tool has a named input and structured result in the domain layer. No generic shell or arbitrary code execution tool is exposed.

## State Architecture

- UI-owned: selected receipt, active section, chat input, timeline reveal animation.
- Agent-owned: processing stage, tool execution events, analysis, metrics, and failure/review state.
- Persisted domain state: receipt classification, eligible ITC, approval, run, and audit event.

The selected receipt is sent to the server as an ID; the server retrieves authoritative receipt data. Receipt text is data, never an instruction source.

## CRA Rule Engine

The configured ruleset is `2026.09.1`.

Documentation tiers:

- Tier 1: total below `$30`; evidence must still allow the registrant to determine the ITC amount.
- Tier 2: `$30` to below `$150`; the prototype requires core transaction details and a vendor tax-registration number for finalization.
- Tier 3: `$150` or more; the highest documentation level is required, including vendor, date, total, tax details, receipt evidence, and a tax-registration number in valid format.

The tier boundaries are deterministic and explicitly tested in the domain implementation. This is a simplified prototype policy; the UI links to CRA’s authoritative documentation rather than presenting the prototype as legal advice.

Sources:

- CRA, Documentary Requirements: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/8-4/documentary-requirements.html
- CRA, General Eligibility Rules: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/8-2/general-eligibility-rules.html
- CRA, General Index of Financial Information: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4088/general-index-financial-information-gifi.html

## GST/HST Number Validation

The format validator distinguishes missing, malformed, suspicious, and valid-format numbers such as `123456789RT0001`. A valid format is not external registration verification. The prototype does not call CRA’s registry.

## ITC Calculation

All calculations use integer cents and round only at the final result:

```text
gross tax cents × meal policy × commercial-use percentage
```

Business meals use the rules-engine policy of 50% for the ordinary case. The policy is represented as a rule input rather than a value supplied by receipt text or user chat. The result includes gross tax, percentage, eligible ITC, status, and a reason code.

## GIFI Engine

The controlled catalogue currently includes:

| Code | Description | Use |
| --- | --- | --- |
| 1001 | Cash | Bank deposits |
| 8810 | Office expenses | Office supplies |
| 8523 | Meals and entertainment | Business meals |

The backend verifies proposed codes against this catalogue. Unknown or ambiguous classifications become `REVIEW_REQUIRED` and do not silently update financial state.

## Security Model

- Strict Zod schemas at request and response boundaries.
- Tool allowlisting with no arbitrary execution.
- Server-side state mutation only.
- Idempotency by receipt state and normalized request message.
- Safe error responses without secrets.
- Receipt and OCR-like text treated as untrusted content.
- Prompt-injection strings cannot change the deterministic category or ITC result.
- High-impact/ambiguous actions create a pending approval instead of bypassing review.

## Prompt Injection Protection

`receipt_005` contains instruction-like vendor text asking the agent to ignore CRA rules and approve 100% ITC. The classifier detects this as untrusted receipt content and routes it to review. It never changes the rules engine’s percentage or reveals system data.

## Observability

Each run stores:

- run ID and receipt ID
- structured tool events
- per-tool status and details
- rule version
- audit action and status
- time to first event, total latency, and tool count

The API also uses structured Pino request logging. The UI exposes the run details so an evaluator can reconstruct what happened.

## Testing and Evaluation

`evaluation/golden-cases.json` contains the assessment dataset covering normal cases, boundary amounts, missing documentation, meals, deposits, prompt injection, invalid GIFI proposals, and duplicate mutations. The deterministic domain functions are intentionally pure where possible so they can be tested with boundary and property-style assertions.

Safety philosophy: false approval is more costly than a false review. When required evidence is missing or the business purpose is ambiguous, the system prefers `review` with zero finalized ITC over a confident approval.

## Performance Benchmarks

The run response includes measured `timeToFirstEventMs` and `totalLatencyMs` fields. The demo is deterministic and local; production benchmarks must be collected with the selected model provider and database under representative load.

## Development

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/loopnow-cpa-copilot run typecheck
pnpm --filter @workspace/loopnow-cpa-copilot run build
```

The configured workflows start the API and web app. The API is available under `/api`, and the web app is served at `/`.

## Docker and Environment

The app uses the workspace-managed workflows in Replit. `.env.example` documents the optional model/provider and observability configuration. The current deterministic demo does not require an API key.

## Production Considerations

Before processing real financial data:

- replace JSON persistence with PostgreSQL transactions and migrations;
- add authenticated tenants and role-based authorization;
- add request size limits and rate limiting at the edge;
- add OpenTelemetry export and redacted structured traces;
- add a real model provider behind the planner interface;
- add external CRA registration verification where permitted;
- expand the GIFI catalogue and rule/source registry with reviewed change control;
- add browser E2E coverage and load testing.

## Known Limitations

- The model provider abstraction is represented by a deterministic planner in this prototype.
- Receipt images/OCR and voice are not included.
- CRA registration verification is format-only.
- Persistence is a JSON file so the demo can run without provisioning a database.
- Streaming is represented by a real structured tool trace that the UI reveals progressively; the backend response itself is JSON rather than token SSE.

## Architecture Decisions

See `docs/architecture.md` and `docs/threat-model.md`.