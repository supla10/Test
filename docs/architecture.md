# Architecture Decision Record

## Context

The product must feel like an app-aware accounting system, not a chat wrapper. Tax calculations, documentation checks, GIFI validation, state changes, and audit records need to be deterministic and inspectable.

## Decisions

### OpenAPI-first contracts

The API contract lives in `lib/api-spec/openapi.yaml`. Orval generates the React Query client and Zod schemas. This prevents the dashboard and server from quietly drifting apart.

### Explicit agent tool loop

Processing is implemented as a named sequence of tools. Each event is stored and returned to the UI. This supports auditability, retries, and future provider/model substitution.

### Deterministic compliance layer

The CRA documentation policy, GST/HST format validation, meal limitation, commercial-use percentage, money rounding, and GIFI catalogue are code-owned. The LLM/model seam can propose an interpretation but cannot be the source of truth for arithmetic or authorization.

### State ownership

React owns selection and presentation state. The agent owns the run stage and tool trace. The persisted domain owns the receipt classification, approval, and audit records. This avoids treating ephemeral UI state as bookkeeping state.

### Persistence boundary

This assessment uses a JSON file behind a store interface to keep the prototype runnable without extra provisioning. The domain model is relational in shape, and the next production step is PostgreSQL with transactions around receipt mutation, approval, run, and audit writes.

### Human approval

Any missing documentation, ambiguous classification, or untrusted instruction-like content creates a pending approval and zero finalized ITC. Approval is an explicit API mutation.

## Known trade-offs

- The prototype uses a deterministic planner rather than a live LLM to keep safety behavior reproducible.
- The UI progressively reveals a server-returned structured run trace instead of using token SSE.
- Authorization is represented by server-owned mutation boundaries but needs tenant identity and roles before production use.

## Future scaling path

1. Introduce tenant-scoped PostgreSQL tables and transactions.
2. Add a provider interface for OpenAI-compatible, Anthropic, and local models.
3. Persist resumable agent runs and tool retries.
4. Emit OpenTelemetry GenAI spans.
5. Add queue-backed OCR/vision extraction with untrusted-input boundaries.