# OpenInfer Protocol Draft 0001

| Field | Value |
| --- | --- |
| Document | **OI-DRAFT-0001** |
| Title | **Protocol family index** |
| Status | **Research Draft** |
| Version | **0.2-dev** |
| Audience | **Implementers, providers, verifier authors, and reviewers** |
| Last updated | **2026-09-04** |

OpenInfer specifies economic transactions between software buyers and machine-service providers that may have no prior relationship. This document indexes the first implementable protocol family. It is not a final standard and does not claim that trust-minimized model execution has been solved.

## 1. Document set

| Document | Status | Responsibility |
| --- | --- | --- |
| [OI-CORE-0001](core/OI-CORE-0001.md) | Implementable baseline | Signed objects, canonical encoding, transaction state, replay handling, errors, and settlement outcomes |
| [OI-PROFILE-INFERENCE-0001](profiles/OI-PROFILE-INFERENCE-0001.md) | Implementable baseline | Open-model inference offers, requests, execution profiles, usage claims, and receipts |
| [OI-PROFILE-OPTIMISTIC-0001](profiles/OI-PROFILE-OPTIMISTIC-0001.md) | Experimental | Trace commitments, post-commit challenge selection, openings, verdicts, and experiment gates |

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

The protocol family should be implemented in this order:

1. Encode and validate the core signed envelope in two languages.
2. Publish cross-language canonicalization, digest, and signature fixtures.
3. Implement `Offer`, `Request`, `Agreement`, `ExecutionCommitment`, `Receipt`, `ReceiptAcceptance`, `Finalization`, and settlement processing in shadow mode.
4. Implement the inference profile with deterministic artifact identity and usage calculation.
5. Map the objects onto Fluxyard's existing Offer-to-Charge path without changing real settlement.
6. Add the optimistic profile only after an ordinary signed receipt survives restart, replay, timeout, and evidence-gap tests.

Real stake, slashing, public providers, and a native asset are outside this sequence.

## 5. Research gates

The experimental optimistic profile advances only if measured evidence supports it:

| Gate | Required result |
| --- | --- |
| Stable execution profile | Honest implementations have documented, bounded divergence |
| Commitment overhead | The selected trace density adds less than 3% service overhead |
| Challenge cost | One selected transition can be checked for less than 0.1% of the original request cost |
| Numeric correctness | Honest false positives remain low while tested shortcuts remain distinguishable |
| Adversarial detection | Detection curves are published for substitution, skipped work, altered routing, and selective cheating |
| Economic viability | At least one conservative parameter region makes expected fraud value negative |
| Operational safety | Shadow settlement survives duplicate delivery, restart, timeout, and missing evidence without duplicate effects |
| Independent verification | Two verifier implementations produce the same verdict from the same evidence |

The percentages are research targets, not protocol guarantees.

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

## 8. Open questions

- Can the optimistic profile verify a useful checkpoint without loading most expert weights or request context?
- What numeric rule separates honest implementation variance from useful cheating?
- Which randomness source is unpredictable, bias-resistant, available, and cheap enough?
- How should private openings be verified without exposing prompts, outputs, or proprietary state?
- Which settlement adapters can provide stable accounting and reliable idempotent effects?
- When is a legal counterparty still the better assurance mechanism?

Unresolved questions remain explicit. They are not filled with a chain, token, proof system, or governance mechanism before experiments require one.
