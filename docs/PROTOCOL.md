# OpenInfer Protocol Draft 0001

| Field | Value |
| --- | --- |
| Document | **OI-DRAFT-0001** |
| Title | **Core transaction and verification protocol** |
| Status | **Research Draft** |
| Version | **0.1** |
| Audience | **Implementers, providers, verifier authors, and reviewers** |
| Last updated | **2026-09-04** |

This document turns the OpenInfer manifesto into a testable protocol proposal. It is not a final standard and does not claim that trust-minimized large-model inference has been solved. Sections marked **proposed** describe a direction to test. Sections marked **inherited from Fluxyard** describe patterns already implemented in Fluxyard's trusted-market control plane and suitable for reuse after adaptation to an open network.

## 1. Purpose

OpenInfer is a protocol for economic transactions between software buyers and machine-service providers that may have no prior relationship. It coordinates five things:

1. discovery of machine-readable offers;
2. agreement on immutable terms;
3. accountable execution and usage receipts;
4. verification proportional to transaction risk; and
5. deterministic settlement or dispute.

The initial service is open-model inference. The protocol may later describe compute, data, tools, storage, media generation, and specialist-agent work without requiring one privileged router.

The central research question is narrower than "prove an LLM ran correctly":

> Can an inference provider commit to a useful execution trace with less than 3% service overhead, while an unpredictable challenged transition can be independently checked for less than 0.1% of the original request cost?

Those numbers are research targets, not promises. Failure is an acceptable result: it would rule out the simplest optimistic design and redirect work toward replication, trusted execution, interactive proofs, or other assurance mechanisms.

## 2. Evidence base and present boundary

Fluxyard already implements a trusted GPU-market transaction spine. OpenInfer should reuse its proven invariants without confusing centralized evidence with cryptographic proof.

| Fluxyard today | OpenInfer extension |
| --- | --- |
| Worker identity scoped to one organization | Public-key identities for providers, buyers, gateways, and verifiers |
| Canonical capability snapshots with revisions and digests | Signed capability and service-profile announcements |
| Revisioned offers and deterministic search | Public discovery across competing registries and gateways |
| Immutable job request digests and idempotency keys | Signed requests and agreements with replay protection |
| Atomic allocation with immutable quote and resource reservation | Provider commitment to agreed service terms and artifact profile |
| Ordered, digest-pinned worker reports with commit-before-ack | Signed receipts and trace commitments challengeable by third parties |
| Cumulative usage evidence and explicit gaps | Independent metering and configurable assurance profiles |
| Append-only charges, corrections, and idempotent billing effects | Stable-value settlement, escrow, stake, challenges, and slashing |
| Manual review when evidence is missing or contradictory | Deterministic dispute states; no silent settlement from incomplete evidence |

Fluxyard's control plane and database are currently trusted. Its capability and usage reports are claims, not attestations. It does not yet provide permissionless identity, open challengers, decentralized settlement, provider staking, or proof of model execution.

## 3. Goals and non-goals

### 3.1 Goals

- Keep gateways and routers replaceable.
- Make every commercial and execution claim machine-readable, bounded, versioned, and attributable.
- Preserve immutable accepted terms even if an offer later changes.
- Make exact replay harmless and changed replay fail.
- Let buyers purchase only the assurance their risk requires.
- Allow independent verifiers to reproduce a verdict from public evidence when privacy policy permits.
- Keep settlement provider-independent and exactly-once in effect.
- Expand beyond inference only after one concrete service is reliable.

### 3.2 Non-goals for v0.1

- Running model inference on a blockchain.
- Selecting a chain, token, signature curve, or governance system before requirements are measured.
- Claiming that a particular physical GPU performed every operation.
- Supporting anonymous hostile multi-tenancy on Docker-only isolation.
- Proving subjective answer quality from execution correctness.
- Making prompts, outputs, or private model state public by default.
- Replacing legal contracts where identifiable counterparties and conventional remedies are preferable.

## 4. Roles and trust boundaries

**Buyer** — requests a service, selects an offer, defines required assurance, and funds settlement. A buyer may be an autonomous agent, smart contract, gateway, or human-controlled application.

**Provider** — advertises capability, accepts an agreement, performs work, and signs receipts. A provider's claims remain untrusted until the required assurance policy is satisfied.

**Gateway** — helps buyers search, route, submit, or monitor requests. It is a client of the protocol and has no privileged protocol authority.

**Verifier** — checks usage, artifact identity, execution openings, or attestations. A verifier may also act as a challenger by bonding a dispute.

**Registry** — indexes signed identities, capabilities, offers, execution profiles, and reputation events. Registry results grant no settlement authority; clients verify signed objects themselves.

**Settlement adapter** — turns one finalized protocol outcome into an external payment, escrow release, refund, or penalty. The adapter may target a stablecoin rail, payment processor, or another ledger.

The provider, buyer, verifier, registry, gateway, network transport, and settlement adapter may all be malicious or unavailable. A v0.1 deployment may temporarily trust some of these roles, but it must name that trust explicitly.

## 5. Canonical protocol objects

Every object is bounded, schema-versioned, canonically encoded, content-digested, and attributable to its issuer where applicable.

| Object | Purpose | Immutable identity |
| --- | --- | --- |
| `IdentityDocument` | Public keys, supported suites, rotation and revocation references | identity digest |
| `CapabilityStatement` | Observed hardware, runtime, locality, and service support | provider + revision + digest |
| `ExecutionProfile` | Exact artifact and numeric semantics being sold | profile digest |
| `Offer` | Capability, price, limits, assurance options, expiry | provider + offer ID + revision |
| `Request` | Desired outcome, constraints, budget, privacy and assurance policy | buyer + nonce + request digest |
| `Agreement` | Accepted request, offer revision, price and deadlines | agreement digest |
| `ExecutionCommitment` | Commitment to output, usage, artifact profile, and optional trace | agreement + commitment digest |
| `Receipt` | Provider's signed claim about delivery and measured work | receipt digest |
| `Challenge` | Post-commit selection and requested opening | receipt + challenge digest |
| `Opening` | Evidence for the challenged portion | challenge + opening digest |
| `Verdict` | Deterministic verification result and reason | challenge + verifier + verdict digest |
| `SettlementInstruction` | Pay, refund, hold, or penalize exactly once | agreement + final outcome |

The first implementation should keep these objects narrow. Service-specific details belong in versioned capability, request, receipt, and verification profiles rather than unbounded maps.

## 6. Transaction lifecycle

```text
DISCOVER
  signed offer selected
      |
      v
AGREE
  request + offer revision -> immutable agreement
      |
      v
COMMIT
  provider accepts terms and locks artifact/execution profile
      |
      v
EXECUTE
  provider performs work and produces signed receipt
      |
      v
VERIFY
  accept, sample, attest, replicate, or challenge
      |
      +-----------> DISPUTED -> OPEN -> VERDICT
      |                                  |
      v                                  v
FINALIZE ----------------------------> FINALIZE
      |
      v
SETTLE
  idempotent pay, refund, hold, or penalty
```

### 6.1 Required invariants

1. An agreement binds the exact request digest and offer revision. A later offer change cannot alter it.
2. A provider commitment is locked before challenge randomness becomes knowable.
3. A receipt names the agreement, execution profile, output digest, usage claim, and commitment digest.
4. Exact object replay is idempotent. Reusing an identity with changed canonical content is a conflict.
5. A missing, gapped, contradictory, or unsupported evidence stream cannot silently produce a final charge.
6. Settlement is emitted only from a final protocol outcome and carries a stable idempotency key across retries.
7. A router may recommend a provider but cannot rewrite signed buyer or provider objects.

Fluxyard already exercises equivalents of invariants 1, 4, 5, and 6 for offers, jobs, allocations, worker reports, usage, and billing. OpenInfer must preserve them across adversarial network participants.

## 7. Canonical data and cryptographic layer

### 7.1 Domain-separated digests

Every signed or content-addressed object uses a domain-separated digest:

```text
object_digest = HASH(
  "openinfer" ||
  network_id ||
  protocol_version ||
  object_type ||
  canonical_object_bytes
)
```

The canonical encoding must reject duplicate fields, unknown required-field interpretations, non-canonical numbers, and ambiguous text normalization. The final encoding and hash suite remain **proposed** until cross-language fixtures prove identical bytes and digests.

### 7.2 Signed envelopes

A signed envelope contains at least:

```text
SignedEnvelope {
  network_id
  protocol_version
  object_type
  issuer_identity
  key_id
  sequence
  issued_at
  expires_at?
  object_digest
  signature_suite
  signature
}
```

The signature covers the complete domain-separated digest. `network_id`, object type, and protocol version prevent cross-network and cross-type replay. Issuer sequence and object-specific nonces provide bounded replay identities; timestamps alone are not replay protection.

### 7.3 Identity and key rotation

- Protocol authority comes from keys, not registry custody.
- An identity document may contain separate signing, settlement, and encryption keys.
- Rotation names both the predecessor and replacement key and becomes effective at a declared sequence.
- Revocation cannot rewrite historical receipts; verification uses the key state valid when the object was issued.
- Buyers may use short-lived or transaction-specific keys when persistent identity is unnecessary.
- A settlement address is not automatically an identity-signing key.

The exact public-key suite is deliberately unresolved. Selection requires implementations in the target agent, browser, worker, verifier, and settlement environments plus measured signing, verification, key-size, and hardware-support results.

### 7.4 Artifact and execution profiles

"Model X" is not precise enough for verifiable inference. An `ExecutionProfile` should commit to the properties required to reproduce or judge the work, including:

- model-weight manifest digest;
- tokenizer and prompt-template digests;
- quantization and numeric representation;
- sampling algorithm, seed semantics, and parameters;
- MoE routing rules and expert manifest when applicable;
- runtime and critical-kernel constraints where they affect verification;
- accumulator precision, rounding, normalization, and accepted error bounds;
- trace schema and commitment algorithm; and
- verifier implementation or conformance-test digest.

Different quantizations or numeric profiles are different verifiable artifacts even when they share a marketing model name.

### 7.5 Trace commitments

The initial optimistic candidate is a Merkle commitment over selected execution checkpoints. A receipt may contain:

```text
ExecutionCommitment {
  agreement_digest
  execution_profile_digest
  input_digest
  output_digest
  usage_digest
  trace_schema
  trace_root
  provider_sequence
}
```

For an MoE model, a checkpoint may bind token index, layer index, input activation commitment, router output, selected expert IDs, relevant expert-output commitment, output activation commitment, and any context required to reproduce that transition.

A Merkle root proves only that the provider has not changed its committed story. It does not prove the story is correct. Correctness requires an independently reproducible opening or another assurance mechanism.

### 7.6 Post-commit randomness

Challenge selection must be unpredictable to the provider until after the execution commitment is locked and must be reproducible by an external reviewer. Candidate sources include a verifiable random function, an external randomness beacon, or a finalized ledger value. The source, delay, bias resistance, and liveness behavior are unresolved.

No v0.1 implementation should label a challenge "random" unless the provider cannot choose, withhold, or cheaply grind the value after seeing the request.

## 8. Receipts and assurance profiles

A receipt is a signed claim, not proof:

```text
Receipt {
  agreement_digest
  provider_identity
  execution_profile_digest
  started_at_claim
  completed_at_claim
  input_digest
  output_digest
  usage_claim
  execution_commitment?
  assurance_profile
  receipt_sequence
}
```

The protocol supports progressive assurance:

| Level | Mechanism | Establishes |
| ---: | --- | --- |
| 0 | Signed receipt | identity and attributable claim |
| 1 | Independent usage check | canonical metering and billed quantity |
| 2 | Optimistic sampling | unpredictable openings from a locked commitment |
| 3 | Trace challenge | independent replay of one disputed transition |
| 4 | TEE attestation | evidence about approved hardware/software environment |
| 5 | Cryptographic proof | proof system defined by the execution profile |

Profiles may be combined. A buyer chooses the minimum acceptable profile in the request; a provider advertises supported profiles in the offer. A higher level is not automatically better if its trust assumptions, cost, privacy, or hardware availability are unsuitable.

## 9. Optimistic verification proposal

### 9.1 Flow

1. The provider executes an ordinary request under one execution profile.
2. It returns output, usage, a signed receipt, and a trace commitment.
3. Only after the commitment is locked does the challenge source select a token, layer, expert, and vector region or another profile-defined checkpoint.
4. The provider opens the selected leaves and Merkle paths plus the minimum state required for replay.
5. A verifier checks profile conformance, commitment membership, routing, the selected computation, and resulting state transition.
6. A valid opening releases settlement after the challenge window. A proven invalid opening, missing opening, or contradictory opening produces the profile-defined dispute outcome.

### 9.2 Guarantee boundary

The first useful guarantee should be narrow:

> The provider delivered output consistent with artifact X under execution profile Y and accurately reported the usage required by the agreement.

It does not prove that a named physical GPU performed every operation. Remote proxying is fraud only if the accepted agreement explicitly sells provider-local execution or attested hardware.

### 9.3 Verdict requirements

A verdict must name a closed reason code such as `valid_opening`, `invalid_membership`, `invalid_transition`, `wrong_profile`, `opening_timeout`, or `verifier_error`. Free-form explanations may accompany evidence but cannot determine settlement.

Conflicting verifier results are not resolved by reputation alone. The profile must define a deterministic reference verifier, an escalation procedure, or a quorum whose trust assumptions are explicit.

## 10. Economics and settlement

OpenInfer separates commerce from protocol security.

- Offers and budgets use stable units.
- A native asset is not required to purchase services.
- Escrow, stake, challenge bond, reward, and penalty are agreement/profile parameters.
- The protocol produces one deterministic settlement instruction; adapters perform the external effect.
- Every adapter uses the same idempotency key across timeout, retry, and unknown outcomes.
- Corrections are append-only and reference the original settlement; history is never rewritten.

A simplified fraud condition is:

```text
expected fraud gain
  < probability of detection × slashable stake
    + challenge cost
    + lost future revenue
```

The experiment program must test selective cheating, verifier cost, provider margins, audit rates, collusion, and griefing before proposing stake values.

Fluxyard's locked allocation quote, control-plane receive-time billing interval, cumulative usage cursor, explicit manual review, append-only corrections, transactional outbox, and stable external idempotency key are the starting implementation patterns. They are not themselves decentralized settlement.

## 11. Discovery, routing, and reputation

Registries index signed objects and may cache derived availability. A discovery response grants no authority; the buyer verifies each object's digest, signature, expiry, sequence, and profile compatibility.

Routers compete on selection policy. One buyer may optimize for price, another for latency, another for geography, and another for assurance. The protocol must not define one universal ranking.

Reputation is derived evidence rather than a mutable provider score. Useful inputs include completed agreements, verification outcomes, opening latency, availability, performance receipts, disputes, key age, and stake history. The aggregation policy belongs to the buyer or gateway and must name its input window and weighting.

## 12. Threat model

The research and implementation must cover at least:

- provider identity theft, key replay, and rollback;
- false capability, artifact, performance, and usage claims;
- model substitution, altered quantization, skipped layers, and incorrect MoE routing;
- selective cheating based on request size, value, timing, or apparent audit probability;
- fabricated but internally consistent trace commitments;
- challenge grinding, delayed commitments, randomness bias, and withholding;
- verifier collusion, false challenges, equivocation, and denial-of-service griefing;
- buyer non-payment, provider non-opening, and settlement-adapter failure;
- registry censorship, stale indexing, Sybil identities, and reputation laundering;
- remote proxy execution when locality or hardware identity is part of the agreement;
- prompt, output, trace, activation, model-weight, and customer-secret disclosure;
- duplicate settlement after timeout or unknown commit outcome; and
- unsafe public supply or hostile workload execution on insufficient isolation.

The open network cannot inherit Fluxyard's trusted-control-plane assumption. Each centralized pilot shortcut must be listed with an owner and removal gate.

## 13. Privacy and availability

- Public receipts should carry digests and bounded metadata, not plaintext prompts or outputs.
- Trace openings may leak activations, routing, or model information. Profiles must define who can read openings and what becomes public after dispute.
- Encryption cannot hide fields that a public verifier must recompute; privacy-preserving verification is a separate research problem.
- Providers must not lose payment solely because an external chain, beacon, or verifier is temporarily unavailable. Agreements define timeouts and safe hold states.
- Evidence gaps remain explicit. A timeout may resolve to refund, partial payment, manual review, or penalty only as declared before execution.

## 14. Experiment program

The experiments run in order. Start without a blockchain, real stake, or public providers. Each stage produces reproducible artifacts, raw measurements, and a written decision.

### E0 — Freeze one verifiable execution profile

**Hypothesis:** one open MoE checkpoint can be described precisely enough that honest implementations expose comparable checkpoints.

**Method:** choose one accessible model from the open MoE families under consideration. Run a fixed prompt/seed corpus across two inference stacks and controlled variations in CUDA, kernels, parallelism, and quantization. Capture tokens, routes, selected activations, logits, latency, and throughput.

**Measure:** output divergence, route divergence, activation error distributions, reproducibility, and performance.

**Gate:** publish a profile that states which variables are fixed, which tolerate bounded error, and which make a distinct artifact. Stop exact-transition work if honest variation cannot be bounded without eliminating practical implementations.

### E1 — Measure trace-commitment overhead

**Hypothesis:** a provider can commit to enough intermediate state without materially degrading service.

**Method:** instrument the selected implementation to commit token/layer checkpoints, MoE routes, selected activation regions, and logit metadata into a Merkle tree. Compare no-trace, sampled-trace, and full candidate-trace modes on short, long, and high-context requests.

**Measure:** time to first token, tokens per second, total latency, GPU memory, CPU cost, committed bytes, proof bytes, and trace storage.

**Gate:** target less than 3% throughput or latency overhead at the chosen trace density. If the target fails, reduce the trace, batch hashing, change the commitment layout, or reject this design.

### E2 — Recompute one challenged transition

**Hypothesis:** a verifier can check one unpredictable checkpoint without loading or rerunning most of the original model request.

**Method:** after the trace root is locked, derive a challenge for one token, layer, expert set, and vector region. Open the Merkle path and minimum input state. Recompute the transition with an independent verifier.

**Measure:** verifier model state required, bytes transferred, compute time, accelerator memory, end-to-end challenge latency, and cost relative to the original request.

**Gate:** target less than 0.1% of original request cost for one transition. If verification requires most model weights or context, stop the simple sampling design and evaluate interactive localization, replication, TEEs, or proof systems.

### E3 — Define numeric correctness

**Hypothesis:** honest GPU implementations can be judged without requiring raw floating-point bit equality.

**Method:** compare exact replay, bounded-error replay, and deterministically quantized checkpoint representations. Vary reduction order, tensor/expert parallelism, precision, normalization, and kernel implementation.

**Measure:** honest false-positive rate, adversarial false-negative rate, tolerance stability, verifier complexity, and performance impact.

**Gate:** choose one rule with a measured low honest-failure rate and useful adversarial separation. If no rule survives implementation variance, optimistic transition verification is not ready.

### E4 — Attack the verifier

**Hypothesis:** post-commit sampling detects economically meaningful shortcuts while accepting honest providers.

**Method:** run an adversary suite:

1. honest reference execution;
2. lower precision or aggressive quantization;
3. skipped transformer layers;
4. fewer experts or altered MoE routing;
5. a smaller substitute model; and
6. selective cheating that becomes honest when a request appears likely to be audited.

Stratify requests by prompt length, output length, context size, time, provider load, and transaction value.

**Measure:** false positives, false negatives, time to detection, fraction of corrupt work before detection, proof failures, and attack profitability.

**Gate:** publish detection curves rather than one headline accuracy. Do not proceed to real stake while any tested shortcut is both profitable and unlikely to be caught.

### E5 — Model audit and staking economics

**Hypothesis:** plausible audit rates, challenge rewards, and stake can make expected fraud value negative without making honest service uneconomic.

**Method:** combine E1–E4 measurements with provider margin, verifier cost, challenge frequency, selective-cheating strategies, collusion, false challenges, and capital cost. Simulate random and stratified audit policies.

**Measure:** network verification overhead, provider capital requirement, verifier return, griefing cost, detection probability, buyer loss before detection, and expected fraud value.

**Gate:** identify at least one robust parameter region under conservative assumptions. If security depends on implausible stake or verifier subsidy, keep the assurance profile experimental.

### E6 — Integrate a shadow protocol through Fluxyard

**Hypothesis:** the open objects can reuse Fluxyard's execution and accounting spine without weakening replay, evidence-gap, or exactly-once guarantees.

**Method:** map signed `Offer`, `Request`, `Agreement`, `Receipt`, and `ExecutionCommitment` objects onto the existing Offer -> Job -> Allocation -> Worker report -> Usage -> Charge path. Run post-commit challenges and shadow verdicts, but keep payments and slashing in sandbox or simulated ledgers.

**Measure:** duplicate effects under lost acknowledgements, changed-replay rejection, receipt-to-allocation traceability, challenge timeout recovery, evidence-gap handling, settlement idempotency, and operator effort.

**Gate:** one end-to-end request must survive Control Plane and Worker restart, an unknown report outcome, duplicate delivery, verifier timeout, and a usage gap without duplicate settlement or silent evidence loss.

### E7 — Independent challenger rehearsal

Run only if E0–E6 pass. Two independently implemented verifiers receive the same receipt, randomness, and opening. Measure deterministic agreement, bandwidth, latency, and conflicting-verdict handling. Open rewards and penalties remain simulated until verifier diversity and dispute resolution are credible.

## 15. Development stages

| Stage | Scope | Money and trust |
| --- | --- | --- |
| R0: laboratory | instrumented provider and verifier; reproducible corpus | no blockchain, no stake, no public claims |
| R1: Fluxyard shadow mode | real jobs and receipts; simulated challenges | trusted providers, sandbox settlement |
| R2: adversarial test network | external verifier implementations and deliberate cheaters | capped test funds, explicit experimental guarantees |
| R3: limited open market | permissionless supply for one execution profile | bounded value, monitored disputes, independently reviewed controls |

No stage advances because a calendar date arrived. It advances only when its experiment gates and threat controls pass.

## 16. Open questions

- Which canonical encoding and signature suite work across all target runtimes?
- What exact state is sufficient to replay one MoE transition?
- Can challenge verification avoid loading most expert weights or KV context?
- What numeric correctness rule separates honest implementation variance from useful cheating?
- Which randomness source is unpredictable, unbiased, available, and cheap enough?
- How are private openings verified without exposing prompts, outputs, or proprietary state?
- What evidence establishes service origin when remote proxying is prohibited?
- How are conflicting verifier verdicts escalated without creating one trusted verifier?
- Which settlement rails provide stable accounting and reliable exactly-once effects?
- Which reputation events remain useful under Sybil identities and key rotation?
- Which parts of registry state must be globally consistent, and which can remain competing indexes?
- When is a legal counterparty still the better assurance mechanism?

## 17. Drafting rule

This document should become more specific only when an experiment, implementation, or independent review supplies evidence. Unresolved fields remain explicit rather than being filled with fashionable cryptography or infrastructure.
