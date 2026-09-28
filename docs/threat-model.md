# Lightweight Threat Model

| Threat | Mitigation |
| --- | --- |
| Prompt injection in receipt/vendor text | Receipt text is treated as data; instruction-like descriptions route to review and cannot override rules. |
| Excessive agency | Small allowlisted tools; no shell, arbitrary SQL, or generic execution tool. |
| Incorrect tax calculation | Integer-cent arithmetic and deterministic rule engine; final state is derived server-side. |
| Invalid GIFI proposal | Controlled catalogue validation; unknown codes fail or route to review. |
| Missing documentation | Tiered documentation engine returns review/insufficient, never a confident approval. |
| Duplicate mutation/replay | Idempotency key derived from receipt state and normalized request. |
| Unauthorized state changes | Financial state updates exist only in server routes; the UI cannot write directly. |
| Credential leakage | No API key is shipped to the client; sensitive configuration is environment-only. |
| Data exfiltration | Safe API errors, redacted audit details, and no arbitrary tool output channel. |
| Model failure | Schema validation and deterministic backend checks prevent malformed results from becoming success. |
| Stream interruption | Run state is persisted and the UI can refetch recent runs; incomplete operations are not reported as successful. |

## OWASP alignment

The design addresses prompt injection, excessive agency, insecure output handling, least-privilege tool design, and human approval for high-impact ambiguity. A production deployment also needs authenticated tenants, role-based authorization, CSRF/origin controls, edge rate limiting, and database-level isolation.