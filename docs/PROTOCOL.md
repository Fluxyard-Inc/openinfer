# OpenInfer Protocol Draft 0001

| Field | Value |
| --- | --- |
| Document | **OI-DRAFT-0001** |
| Title | **Protocol family index** |
| Status | **Research Draft** |
| Version | **0.3-dev** |
| Audience | **Implementers, providers, verifier authors, and reviewers** |
| Last updated | **2026-09-04** |

OpenInfer specifies economic transactions between software buyers and machine-service providers that may have no prior relationship. This document indexes the first implementable protocol family. It is not a final standard and does not claim that trust-minimized model execution has been solved.

## 1. Document set

| Document | Status | Responsibility |
| --- | --- | --- |
| [OI-CORE-0001](core/OI-CORE-0001.md) | Implementable baseline | Signed objects, canonical encoding, transaction state, replay handling, errors, and settlement outcomes |
| [OI-PROFILE-INFERENCE-0001](profiles/OI-PROFILE-INFERENCE-0001.md) | Implementable baseline | Open-model inference offers, requests, execution profiles, usage claims, and receipts |
| [OI-PROFILE-SIGNED-RECEIPT-0001](profiles/OI-PROFILE-SIGNED-RECEIPT-0001.md) | Implementable baseline | Buyer-checked delivery, ordinary signed receipts, and simulated settlement |
| [OI-PROFILE-OPTIMISTIC-0001](profiles/OI-PROFILE-OPTIMISTIC-0001.md) | Experimental; paused | Trace commitments and challenge rules; outside the current pilot |

An implementation conforms to OpenInfer only by naming a core version and one or more service and assurance profiles. Support for the core alone does not imply support for inference or optimistic verification.

## 2. Separation of concerns

The core protocol defines the parts that every service needs:

1. cryptographic identity and signed envelopes;
2. immutable references between offers, requests, agreements, receipts, and outcomes;
3. a deterministic transaction state machine;
4. replay-safe processing and exactly-once settlement intent;
5. closed validation and error codes; and
6. extension points for service, assurance, and settlement profiles.

Service profiles define what was purchased and how delivery is measured. Assurance profiles define what evidence is required before settlement. Experimental assurance mechanisms must not redefine the core transaction lifecycle.

## 3. Current boundary

Fluxyard already implements a trusted GPU-market transaction spine. The first OpenInfer implementation should reuse its proven invariants without presenting centralized evidence as cryptographic proof.

| Fluxyard today | OpenInfer extension |
| --- | --- |
| Revisioned offers and deterministic search | Signed offers that competing registries can index |
| Immutable job request digests and idempotency keys | Signed requests and agreements with replay protection |
| Atomic allocation with an immutable quote | Provider commitment to accepted service terms |
| Ordered, digest-pinned worker reports | Signed receipts attributable to a provider identity |
| Cumulative usage evidence and explicit gaps | Profile-defined metering and dispute outcomes |
| Append-only charges and stable idempotency keys | Provider-independent settlement instructions |

Fluxyard's control plane and database remain trusted. It does not yet provide permissionless identity, independent challengers, decentralized settlement, provider staking, or proof of model execution.

## 4. Implementation sequence

Start with the [practical research plan](RESEARCH.md): establish a recurring buyer need, deliver through a known provider, and measure full cost and repeat use. Existing Fluxyard capabilities are sufficient to begin that investigation; implementing the entire draft is not an entry requirement.

Where portable signed records remove demonstrated coordination work:

1. Map the selected service's accepted terms, workload identity, delivery, and usage evidence onto Fluxyard's existing Offer-to-Charge path.
2. Implement and validate the complete required transaction path for the selected core, service, and signed-receipt profiles in shadow mode. A partial pilot record must not be described as protocol-conformant.
3. Exercise restart, replay, timeout, and evidence-gap cases without duplicate effects or silent evidence loss.
4. Add cross-language canonicalization, digest, and signature fixtures when a second implementation is needed; two interoperable implementations remain required for candidate maturity.

OpenInfer settlement remains simulated. Commercial pilots require separately approved ordinary billing and Fluxyard's operational gates. Real stake, slashing, permissionless admission, and a native asset are outside this sequence. Optimistic verification requires a separate decision under the practical plan, not automatic progression from signed receipts.

## 5. Practical research gates

The current pilot advances on evidence of useful transactions:

| Gate | Required result |
| --- | --- |
| Buyer need | One recurring workload, a current alternative, an accepted price, and measurable acceptance criteria |
| Accountable delivery | Buyer-accepted output, traceable terms and usage, and explicit failure handling |
| Repeat use | The buyer chooses further representative jobs; internal demos and simulated payments do not establish demand |
| Delivery economics | Full recurring costs and operator effort are acceptable, or one bounded fix can be tested |
| Operational safety | The pilot path survives duplicate delivery, restart, timeout, and missing evidence without duplicate charges or silent evidence loss |
| Assurance escalation | A specific unmet trust requirement justifies a budgeted comparison with simpler audits |

The [practical research plan](RESEARCH.md) defines the four-week method and stop decisions. The former E0–E7 program and fixed percentage targets are superseded; their prior text remains in Git history. The optimistic profile remains paused and unproven.

## 6. Maturity labels

- **Implementable baseline** means the document chooses concrete wire rules and contains enough information to build a conforming prototype. It does not mean production-ready or secure.
- **Experimental** means the object format is implementable but its security or economic guarantee remains unproven.
- **Candidate** will require published test vectors, a conformance suite, and two interoperable implementations.
- **Stable** will require operational experience, an external security review, documented compatibility policy, and public change control.

## 7. Change policy

Protocol-semantic changes use pull requests. Each change must state:

- which document and version it changes;
- whether it changes signed bytes, validation, state transitions, or settlement;
- the compatibility effect;
- tests or fixtures that demonstrate the change; and
- any new trust or privacy assumption.

Editorial changes may merge without a version change. A change to signed bytes or normative behavior requires a new draft version.

### 7.1 Review revision and compatibility

This revision selects `oi-core/0.2`, `oi.inference/0.2`, `oi.optimistic/0.2`, and `oi.settlement-policy.mock/0.2`; `oi.signed-receipt/0.1` is new. The cryptographic suite remains unchanged, but the signed-envelope domain is now `openinfer-signed-envelope-v0.2`. Old signed objects MUST NOT be silently converted or combined with this version's transaction history. A new purchase uses new signatures and identifiers.

The changes add output/usage commitments and OpeningAcceptance, enforce one purchase per request and sufficient same-asset reservation, change replay-before-expiry validation, and close policy registries. The follow-up review adds separate receipt-delivery/validation deadlines, signed receipt observations, bounded short-output sampling, a complete Verdict schema, and explicit operator handling of simulated indeterminate holds. The baseline continues to trust one buyer/finalizer for acceptance and observed delivery times. [Runnable examples and regression checks](../tests/protocol-cases.mjs) cover the review cases and explicitly distinguish sequential models from pending database concurrency tests; full cross-language conformance artifacts remain necessary before candidate maturity. The practical-plan revision changes research priorities, not signed bytes, profile identifiers, validation, or settlement behavior.

## 8. Open questions

- Which recurring workload gives a buyer a measurable reason to use Fluxyard?
- Does repeat delivery remain worthwhile after accounting for failures and operator time?
- Which coordination or trust problem requires additional protocol machinery?
- Can the optimistic profile verify a useful checkpoint without loading most expert weights or request context?
- What numeric rule separates honest implementation variance from useful cheating?
- Which randomness source is unpredictable, bias-resistant, available, and cheap enough?
- How should private openings be verified without exposing prompts, outputs, or proprietary state?
- Which settlement adapters can provide stable accounting and reliable idempotent effects?
- When is a legal counterparty still the better assurance mechanism?

Unresolved questions remain explicit. They are not filled with a chain, token, proof system, or governance mechanism before experiments require one.
