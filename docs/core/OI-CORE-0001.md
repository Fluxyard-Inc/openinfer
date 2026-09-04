# OI-CORE-0001: Core Transaction Protocol

| Field | Value |
| --- | --- |
| Status | **Implementable Baseline** |
| Version | **0.1.0-dev** |
| Depends on | RFC 3339, RFC 4648, RFC 8032, RFC 8174, RFC 8785 |
| Last updated | **2026-09-04** |

## 1. Scope

This document defines the service-independent OpenInfer wire protocol: signed objects, identifiers, validation order, transaction state, replay handling, errors, and settlement outcomes. Service payloads and assurance evidence are defined by profiles.

This baseline is concrete enough for prototype implementations. It is not production-ready and has not received an external security review.

## 2. Requirements language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted as described by [BCP 14](https://www.rfc-editor.org/info/bcp14) when they appear in uppercase.

An implementation conforms to `oi-core/0.1` when it:

1. accepts and produces the signed envelope defined here;
2. applies validation in the defined order;
3. implements every core state transition and error code;
4. makes exact replay idempotent and changed replay fail; and
5. passes the published core fixtures for its protocol version.

## 3. Baseline cryptographic suite

`oi-suite-jcs-ed25519-sha256/0.1` fixes one interoperable baseline:

| Function | Required algorithm |
| --- | --- |
| Object encoding | JSON constrained to I-JSON and canonicalized with [JCS](https://www.rfc-editor.org/rfc/rfc8785.html) |
| Text encoding | UTF-8 |
| Digest | SHA-256 |
| Signature | Ed25519 as specified by [RFC 8032](https://www.rfc-editor.org/info/rfc8032/) |
| Binary text form | Unpadded base64url from [RFC 4648 section 5](https://www.rfc-editor.org/info/rfc4648/) |
| Timestamp | UTC [RFC 3339](https://www.rfc-editor.org/info/rfc3339/) with second precision |

Other suites require a new suite identifier. Implementations MUST NOT negotiate an unspecified algorithm from user-controlled fields.

Ed25519 verification MUST reject non-canonical encodings of the public key or signature point, public keys or signature points of small order, and signatures whose scalar `S` is greater than or equal to the group order `L`. Verification uses the cofactorless equation `[S]B = R + [k]A`. These cases are part of the required invalid-signature fixtures.

## 4. Primitive types

### 4.1 Canonical JSON

Transport JSON does not need to arrive in canonical order. Before hashing or signing, an implementation MUST parse the value, reject duplicate keys and invalid Unicode, validate its schema, and serialize it with JCS.

Unknown top-level envelope fields MUST be rejected. Every field defined by the active envelope and payload schemas MUST be present; an optional or branch-inapplicable value is represented by `null`, never by omission. A profile defines whether unknown payload fields are rejected. The baseline profiles reject them.

JSON numbers MUST NOT appear in signed payloads. Decimal prices, quantities, and parameters use integer minor units or decimal strings defined by a profile.

### 4.2 Strings and counters

`UIntString` is a JSON string matching `0|[1-9][0-9]*`. It has no sign, leading zero, decimal point, exponent, or whitespace. Sequences, monetary amounts, and counters that may exceed JavaScript's safe integer range use `UIntString`.

`PositiveUIntString` is a JSON string matching `[1-9][0-9]*`.

`Timestamp` is `YYYY-MM-DDTHH:MM:SSZ`. Fractional seconds and non-UTC offsets are invalid in `oi-core/0.1`.

`NetworkId` matches `[a-z0-9][a-z0-9.-]{0,63}`.

`ProfileId` matches `[a-z0-9][a-z0-9.-]*/[0-9]+\.[0-9]+`.

### 4.3 Binary values and digests

Binary values use unpadded base64url. A SHA-256 digest is written as:

```text
sha256:<43-character unpadded base64url value>
```

Implementations MUST reject padded, non-canonical, or incorrectly sized values.

## 5. Identity

An Ed25519 identity identifier is:

```text
oi:<43-character unpadded base64url SHA-256 digest of the raw 32-byte public key>
```

The initial key identifier is `<identity>#0`.

An `IdentityDocument` payload contains exactly one signing key:

```json
{
  "identity": "oi:<digest>",
  "keys": [
    {
      "key_id": "oi:<digest>#0",
      "purpose": ["signing"],
      "public_key": "<base64url raw Ed25519 public key>"
    }
  ]
}
```

The identity document is self-signed. A verifier MUST confirm that the identity equals the digest-derived identifier of the signing key. Key rotation and revocation require a later identity profile or an external resolver; `oi-core/0.1` does not infer historical validity from issuer-controlled timestamps.

Multi-signature, threshold, and hardware-attested identities are outside `oi-core/0.1`.

## 6. Signed envelope

Every attributable object uses this envelope:

```json
{
  "network_id": "openinfer-testnet-1",
  "protocol": "oi-core/0.1",
  "suite": "oi-suite-jcs-ed25519-sha256/0.1",
  "kind": "offer",
  "issuer": "oi:<digest>",
  "key_id": "oi:<digest>#0",
  "sequence": "42",
  "issued_at": "2026-09-04T00:00:00Z",
  "expires_at": "2026-09-05T00:00:00Z",
  "payload_digest": "sha256:<digest>",
  "payload": {},
  "signature": "<base64url Ed25519 signature>"
}
```

The allowed `kind` values are:

```text
identity_document
capability_statement
execution_profile
offer
request
agreement
execution_commitment
receipt
receipt_acceptance
challenge
opening
verdict
finalization
settlement_instruction
settlement_receipt
```

`expires_at` MAY be `null` only where the object-specific rules permit it.

### 6.1 Digests and signature input

```text
payload_bytes  = JCS(payload)
payload_digest = "sha256:" + BASE64URL(SHA-256(payload_bytes))

unsigned_envelope = envelope with the signature field removed
signature_input   = UTF8("openinfer-signed-envelope-v0.1\n")
                    || JCS(unsigned_envelope)
signature         = Ed25519-Sign(private_key, signature_input)
envelope_digest   = "sha256:" + BASE64URL(SHA-256(signature_input))
object_id         = kind + ":" + BASE64URL(SHA-256(signature_input))
```

The signature covers the payload, network, protocol, suite, kind, issuer, key, sequence, and validity period. An implementation MUST recompute `payload_digest`; it MUST NOT trust the supplied value.

## 7. Core payloads

All payloads contain only the fields listed here plus fields required by their named profiles. Unknown fields are invalid.

An `ExecutionProfile` payload and its authorized issuer are defined by its service profile. Its envelope digest, not a display name or retrieval URI, is authoritative.

### 7.1 `CapabilityStatement`

| Field | Type | Rule |
| --- | --- | --- |
| `capability_id` | string | Stable provider-chosen identifier |
| `revision` | `UIntString` | Increased for changed content |
| `provider` | identity | MUST equal envelope issuer |
| `service_profiles` | array of `ProfileId` | Supported service profiles |
| `execution_profile_digests` | array of digests | Supported signed execution profiles |
| `valid_from` | `Timestamp` | Inclusive |
| `valid_until` | `Timestamp` | Exclusive |

The tuple `(provider, capability_id, revision)` MUST map to one envelope digest.

### 7.2 `Offer`

| Field | Type | Rule |
| --- | --- | --- |
| `offer_id` | string | Stable provider-chosen identifier |
| `revision` | `UIntString` | Increased for changed terms |
| `provider` | identity | MUST equal envelope issuer |
| `service_profile` | `ProfileId` | Defines service-specific terms |
| `capability_digest` | digest | Signed capability statement |
| `terms` | object | Defined by service profile |
| `assurance_profiles` | array of `ProfileId` | Supported evidence mechanisms |
| `valid_from` | `Timestamp` | Inclusive |
| `valid_until` | `Timestamp` | Exclusive |

The identity tuple `(provider, offer_id, revision)` MUST map to one envelope digest. Changed content under the same tuple is `replay_conflict`.

### 7.3 `Request`

| Field | Type | Rule |
| --- | --- | --- |
| `request_id` | string | Unique within buyer identity |
| `buyer` | identity | MUST equal envelope issuer |
| `service_profile` | `ProfileId` | MUST match selected offer |
| `offer_digest` | digest | Exact offer revision |
| `service_request` | object | Defined by service profile |
| `assurance_profile` | `ProfileId` | One advertised by offer |
| `assurance_parameters` | object | Defined by assurance profile |
| `settlement_asset` | string | Profile or adapter-defined asset identifier |
| `maximum_amount` | `UIntString` | Asset minor units |
| `settlement_policy` | object | Signed policy described below |
| `minimum_commit_window_seconds` | `UIntString` | Buyer-required time after agreement issuance |
| `minimum_receipt_window_seconds` | `UIntString` | Buyer-required time after commitment deadline |
| `nonce` | string | At least 128 bits of random data, base64url |
| `expires_at` | `Timestamp` | Request acceptance deadline |

`expires_at` MUST equal the Request envelope `expires_at`. `settlement_policy` MUST contain `profile`, `finalizer`, `instruction_issuer`, `adapter`, `adapter_identity`, and a closed `reason_map`. The map is keyed only by finalization reason codes and MUST contain exactly one settlement action for every code permitted by the service and assurance profiles named by the agreement. The baseline mock policy shape is:

```json
{
  "profile": "oi.settlement-policy.mock/0.1",
  "finalizer": "oi:<digest>",
  "instruction_issuer": "oi:<digest>",
  "adapter": "oi.settlement.mock/0.1",
  "adapter_identity": "oi:<digest>",
  "reason_map": {
    "valid_verdict": "pay",
    "invalid_verdict": "refund",
    "indeterminate_verdict": "hold",
    "commitment_timeout": "refund",
    "receipt_timeout": "refund"
  }
}
```

### 7.4 `Agreement`

| Field | Type | Rule |
| --- | --- | --- |
| `agreement_id` | string | Provider-chosen identifier |
| `request_digest` | digest | Exact signed request |
| `offer_digest` | digest | MUST equal request reference |
| `buyer` | identity | From request |
| `provider` | identity | MUST equal envelope issuer |
| `service_profile` | `ProfileId` | From request and offer |
| `assurance_profile` | `ProfileId` | From request |
| `accepted_amount` | `UIntString` | MUST NOT exceed request maximum |
| `settlement_asset` | string | MUST equal request asset |
| `settlement_policy_digest` | digest | Core digest of the exact request policy object |
| `commit_deadline` | `Timestamp` | Latest commitment time |
| `receipt_deadline` | `Timestamp` | Latest receipt time |
| `verification_deadline` | `Timestamp` | Latest ordinary verification time |

The signed request represents the buyer's intent. The provider-signed agreement represents acceptance. The Agreement envelope `issued_at` MUST be no later than Request `expires_at`. `commit_deadline` MUST be at least Agreement `issued_at + minimum_commit_window_seconds`; `receipt_deadline` MUST be at least `commit_deadline + minimum_receipt_window_seconds`; and `verification_deadline` MUST satisfy every additional minimum window defined by the assurance profile. An agreement MUST NOT alter service request, assurance parameters, or settlement policy; it binds them by digest.

### 7.5 `ExecutionCommitment`

| Field | Type |
| --- | --- |
| `agreement_digest` | digest |
| `provider` | identity |
| `service_profile` | `ProfileId` |
| `assurance_profile` | `ProfileId` |
| `execution_profile_digest` | digest |
| `input_digest` | digest |
| `commitment_profile` | `ProfileId` or `null` |
| `commitment` | profile-defined object or `null` |

`provider`, `service_profile`, `assurance_profile`, and the envelope issuer MUST equal their Agreement values. If the Agreement's assurance profile requires a commitment, `commitment_profile` MUST equal the accepted profile and `commitment` MUST NOT be `null`. The provider MUST issue this object before any assurance-profile randomness becomes knowable. A mismatch is `profile_mismatch`.

### 7.6 `Receipt`

| Field | Type |
| --- | --- |
| `agreement_digest` | digest |
| `commitment_digest` | digest |
| `provider` | identity |
| `service_profile` | `ProfileId` |
| `execution_profile_digest` | digest |
| `input_digest` | digest |
| `output_digest` | digest |
| `usage` | service-profile object |
| `performance` | service-profile object |
| `assurance_profile` | `ProfileId` |
| `assurance_evidence` | profile-defined object or `null` |
| `started_at` | `Timestamp` |
| `completed_at` | `Timestamp` |

`provider`, `service_profile`, `assurance_profile`, and the envelope issuer MUST equal their Agreement values. `commitment_digest` MUST identify the accepted commitment for that agreement. A mismatch is `profile_mismatch`.

### 7.7 `ReceiptAcceptance`

The finalizer acknowledges receipt delivery with:

```json
{
  "agreement_digest": "sha256:<digest>",
  "receipt_digest": "sha256:<digest>"
}
```

The envelope issuer MUST equal `settlement_policy.finalizer`. Its envelope `issued_at` is the reproducible start of assurance windows. It MUST be no earlier than the Receipt envelope `issued_at` and no later than `Agreement.receipt_deadline`.

### 7.8 Assurance objects

`Challenge`, `Opening`, and `Verdict` MUST reference the receipt digest and named assurance profile. Their profile-specific fields are opaque to the core, but their envelopes, signatures, replay rules, and state transitions remain core-governed.

A verdict contains the common fields:

```json
{
  "receipt_digest": "sha256:<digest>",
  "challenge_digest": "sha256:<digest>",
  "opening_digest": "sha256:<digest>",
  "assurance_profile": "oi.optimistic/0.1",
  "verifier": "oi:<digest>",
  "outcome": "valid",
  "reason_code": "all_checks_valid",
  "evidence_digest": "sha256:<digest>"
}
```

`outcome` is `valid`, `invalid`, or `indeterminate`. An `indeterminate` verdict MUST NOT authorize provider payment unless the agreement explicitly defines that outcome.

### 7.9 Finalization

Deadlines and verdicts do not directly create a final state. The identity named by `settlement_policy.finalizer` MUST issue a `Finalization`:

```json
{
  "agreement_digest": "sha256:<digest>",
  "receipt_digest": "sha256:<digest>",
  "evidence_digest": "sha256:<digest>",
  "revision": "0",
  "supersedes_digest": null,
  "outcome": "valid",
  "reason_code": "no_challenge"
}
```

`outcome` is `valid`, `invalid`, or `indeterminate`. Finalization reason codes form a closed registry: this core defines `commitment_timeout` and `receipt_timeout`; each active service and assurance profile defines its additional codes, required prior state, earliest permissible time, required evidence, and outcome. A receiver MUST reject a Finalization unless its envelope issuer is `settlement_policy.finalizer` and every registered precondition is reproducible from accepted signed objects.

`commitment_timeout` requires state `agreed`, outcome `invalid`, envelope `issued_at >= Agreement.commit_deadline`, and null receipt and evidence digests. `receipt_timeout` requires state `committed`, outcome `invalid`, envelope `issued_at >= Agreement.receipt_deadline`, and null receipt and evidence digests. Reasons reachable after Receipt acceptance require a non-null `receipt_digest`; verdict reasons require `evidence_digest` to identify the accepted Verdict.

Revision `0` MUST use null `supersedes_digest`. A later revision is valid only when it supersedes the current held Finalization: it increments the previous revision by one, identifies that Finalization in `supersedes_digest`, and satisfies a supersession rule defined by the active profile. The tuple `(agreement_digest, finalizer, revision)` maps to one digest; conflicting content is `settlement_conflict`.

### 7.10 Settlement objects

A `SettlementInstruction` is emitted only from a final outcome:

```json
{
  "agreement_digest": "sha256:<digest>",
  "finalization_digest": "sha256:<digest>",
  "instruction_revision": "0",
  "supersedes_instruction_digest": null,
  "outcome": "pay",
  "asset": "usd:6",
  "provider_amount": "120000",
  "buyer_amount": "0",
  "adapter": "oi.settlement.mock/0.1",
  "idempotency_key": "settlement:<finalization digest>:0"
}
```

`outcome` is `pay`, `refund`, or `split`. `accepted_amount` is the amount reserved for the agreement, and `provider_amount + buyer_amount` MUST equal it. `refund` requires provider amount zero and buyer amount equal to the accepted amount. `pay` uses the service-profile charge and returns any remainder to the buyer. `split` amounts are fixed by the settlement-policy profile. Penalties require a later bond profile and are not part of `oi-core/0.1`. The envelope issuer MUST equal `settlement_policy.instruction_issuer`; `adapter`, outcome, and amounts MUST follow the signed reason map and referenced Finalization. A `hold` action creates state `held` and no SettlementInstruction.

`idempotency_key` MUST equal `settlement:<finalization_digest>:<instruction_revision>`. Instruction revision `0` uses null `supersedes_instruction_digest`. After a rejected SettlementReceipt, one corrected instruction MAY increment the revision, reference the rejected instruction, preserve the finalization, outcome, asset, amounts, and adapter, and use the corresponding new idempotency key. An adapter performing multiple transfers derives stable sub-operation keys from the instruction idempotency key.

A `SettlementReceipt` payload is:

```json
{
  "instruction_digest": "sha256:<digest>",
  "adapter": "oi.settlement.mock/0.1",
  "adapter_operation_id": "<stable adapter identifier>",
  "result": "committed",
  "external_reference": "chain:tx123",
  "observed_at": "2026-09-04T00:10:00Z"
}
```

The envelope issuer MUST equal `settlement_policy.adapter_identity`. `result` is `committed`, `rejected`, or `unknown`; `external_reference` MAY be `null` for `rejected` or `unknown`. Retrying an `unknown` result MUST reuse the instruction's `idempotency_key` and `adapter_operation_id`.

## 8. Transaction state machine

The authoritative transaction state is derived from accepted signed objects, not a mutable status supplied by one participant.

| Current state | Accepted object | Next state |
| --- | --- | --- |
| none | valid `Agreement` | `agreed` |
| `agreed` | valid `ExecutionCommitment` | `committed` |
| `committed` | valid `Receipt` plus its valid `ReceiptAcceptance` | `verification_pending` |
| `verification_pending` | valid `Challenge` | `disputed` |
| `disputed` | valid `Opening` | `opened` |
| `opened` | valid `Verdict` | `verdict_available` |
| `agreed`, `committed`, `verification_pending`, `disputed`, `opened`, or `verdict_available` | valid `Finalization` | `finalized_valid`, `finalized_invalid`, `finalized_indeterminate`, or `held` |
| `finalized_valid`, `finalized_invalid`, or `finalized_indeterminate` | valid `SettlementInstruction` | `settlement_pending` |
| `settlement_pending` | committed `SettlementReceipt` | `settled` |
| `settlement_pending` | rejected `SettlementReceipt` | `settlement_failed` |
| `settlement_pending` | unknown `SettlementReceipt` | remains `settlement_pending` |
| `settlement_failed` | valid replacement `SettlementInstruction` | `settlement_pending` |
| `held` | profile-permitted new evidence | profile-defined pre-final state |

An invalid transition MUST return `invalid_state` and MUST NOT mutate transaction state.
Time passing alone never changes state; a deadline outcome requires a valid signed `Finalization`. `held` and `settlement_failed` are non-final. `settled` is terminal.

## 9. Validation order

A receiver MUST validate an envelope in this order and stop at the first failure:

1. Parse JSON while rejecting duplicate keys and invalid Unicode.
2. Validate top-level envelope fields, primitive formats, size limits, and `kind`.
3. Confirm supported network, core version, and cryptographic suite.
4. Validate the payload schema for the named kind and profiles.
5. Recompute and compare `payload_digest` using JCS.
6. Resolve the raw public key named by `key_id`, require `key_id == issuer + "#0"`, recompute the identity digest from that key, compare it to `issuer`, and perform strict Ed25519 verification.
7. Check envelope expiry and deadlines that do not depend on referenced objects.
8. Apply replay checks.
9. Resolve referenced objects and compare their digests and identities.
10. Verify profile semantics, cross-object deadlines, and that the issuer is authorized for the object role.
11. Validate the transaction state transition.
12. Persist the object and resulting state atomically.

A receiver MUST NOT partially accept an envelope.

## 10. Replay and idempotency

The replay key is `(network_id, issuer, kind, sequence)`.

- A replay whose envelope digest matches the stored digest returns the original result without another state or settlement effect.
- A replay with different content returns `replay_conflict`.
- A receiver MAY accept out-of-order sequences but MUST retain enough history to detect conflicts until the object's expiry plus the network retention window.
- Expiry is not permission to repeat an external settlement effect.
- A settlement adapter MUST retain idempotency records according to its profile, independent of envelope retention.

## 11. Core errors

Errors use this shape:

```json
{
  "code": "invalid_signature",
  "object_id": "receipt:<digest>",
  "retryable": false,
  "detail": "non-normative text or null"
}
```

The closed v0.1 codes are:

```text
invalid_json
invalid_schema
invalid_canonical_value
unsupported_network
unsupported_version
unsupported_suite
unsupported_kind
unsupported_profile
invalid_digest
invalid_signature
unknown_identity
unknown_key
unauthorized_issuer
expired
deadline_exceeded
replay_conflict
missing_reference
reference_mismatch
profile_mismatch
invalid_state
evidence_missing
invalid_challenge
settlement_conflict
temporarily_unavailable
```

`unauthorized_issuer` means a valid signer is not the role named by the Agreement, profile, or settlement policy. `evidence_missing` means a required signed or digest-addressed evidence object is unavailable or incomplete. `temporarily_unavailable` means a required resolver or dependency failed before state mutation and is the only retryable core error. The object-specific rules above define every other trigger.

`detail` MUST be a string or `null` and MUST NOT change machine behavior. Retryability is fixed by the error-code registry in the conformance fixtures, not chosen per response.

## 12. Security and privacy requirements

- Implementations MUST place byte, depth, array-length, and field-length limits on every object before expensive signature or profile verification.
- Public objects SHOULD carry digests and bounded metadata rather than plaintext prompts or outputs.
- Registry discovery grants no authority; clients verify every signed object.
- Gateways MUST NOT rewrite buyer or provider envelopes.
- A missing, gapped, contradictory, or unsupported evidence stream MUST NOT silently produce a provider payment.
- Key compromise, finalizer or verifier collusion, denial-of-service, privacy leakage, registry censorship, and settlement-adapter failure remain explicit deployment risks.

## 13. Required conformance artifacts

Before this baseline becomes a candidate, the repository must contain:

1. canonical JSON fixtures including Unicode and numeric edge cases;
2. valid and invalid identity, envelope, strict Ed25519, and digest vectors;
3. exact-replay and changed-replay fixtures;
4. every valid and invalid state transition, including Receipt acceptance, deadline finalization, hold supersession, and rejected-settlement replacement;
5. every error code with fixed retryability;
6. absent-versus-null rejection, settlement conservation, and unknown-result retry tests; and
7. two implementations that produce identical signed bytes and results.

Those fixtures are the next implementation artifact. Until they exist, `Implementable Baseline` means the specification is concrete, not proven interoperable.
