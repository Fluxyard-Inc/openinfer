# OI-PROFILE-SIGNED-RECEIPT-0001: Buyer-Accepted Receipts

| Field | Value |
| --- | --- |
| Profile identifier | **oi.signed-receipt/0.1** |
| Status | **Implementable Baseline** |
| Core dependency | **oi-core/0.2** |
| Initial service dependency | **oi.inference/0.2** |
| Last updated | **2026-09-04** |

## 1. Scope and trust

This is the first laboratory/fluxyard shadow assurance path. It establishes a provider-attributable result and buyer-checked delivery/usage. It does not establish faithful model execution. The buyer is trusted to acknowledge delivery honestly and operates the authoritative acceptance/finalization ledger. The mock adapter performs simulated accounting only; buyer withholding and finalizer collusion are not solved by this profile.

## 2. Request and commitment

The Offer advertises `oi.signed-receipt/0.1`. The Request selects it with `assurance_parameters = {}`; any other parameter is `profile_mismatch`. The policy profile is `oi.settlement-policy.mock/0.2`, the adapter is `oi.settlement.mock/0.1`, and `finalizer` and `instruction_issuer` MUST equal the buyer. `adapter_identity` identifies the mock ledger signer.

The provider executes the accepted inference request and issues an ExecutionCommitment before its deadline. The commitment still binds the execution profile, rendered input, output, and usage digests; `commitment_profile` and `commitment` MUST both be `null`. The Receipt's `assurance_evidence` MUST be `null`. An anchor, trace, Challenge, Opening, OpeningAcceptance, or Verdict is neither required nor valid for this assurance profile.

The Agreement MUST satisfy `verification_deadline >= acceptance_deadline`. Core uniqueness, quote-asset equality, and worst-case reservation checks apply before accepting it.

## 3. Acceptance and finalization

The buyer MUST receive the entire committed output and Receipt by the receipt deadline, then validate the inference Receipt and all referenced digests and recompute usage before signing ReceiptAcceptance. It records its delivery observation in `receipt_observed_at` and accepts the Receipt and acknowledgement atomically by the acceptance deadline. A valid acknowledgement transitions `committed` to `verification_pending`.

This assurance profile adds one Finalization reason:

| Reason | Required state and evidence | Earliest time | Outcome |
| --- | --- | --- | --- |
| `receipt_accepted` | `verification_pending`; accepted ReceiptAcceptance digest | ReceiptAcceptance issuance | `valid` |

The Finalization MUST name the same agreement and receipt as that acknowledgement. The exact mock `reason_map` is the union of the two core timeout reasons and this profile's one success reason:

```json
{
  "commitment_timeout": "refund",
  "receipt_timeout": "refund",
  "receipt_accepted": "pay"
}
```

Unknown keys, missing keys, or changed actions are `profile_mismatch`. There are no hold/split actions or Finalization supersessions in this profile. Settlement amounts follow the inference charge formula, returning unused reservation to the buyer. Rejected/unknown mock settlement results use the core retry rules.

## 4. Complete successful example

Run from the repository root with Node.js:

```sh
node tests/protocol-cases.mjs
node tests/protocol-cases.mjs --example
```

The second command emits a complete signed JSON transcript: three self-signed identities, ExecutionProfile, CapabilityStatement, Offer, Request, Agreement, ExecutionCommitment, Receipt, ReceiptAcceptance, Finalization, SettlementInstruction, and SettlementReceipt. References are computed from the preceding objects, and the output, rendered input, artifact manifest, and source prompt are included as fixture data. The deterministic signing keys are public **test keys**, never credentials for real transactions.

The fixture's one-token model/tokenizer/template identifiers are synthetic test definitions, not a real inference implementation or verification claim. Its ASCII/string-only payloads exercise a subset of JCS. The test program is a runnable specification example and selected regression checks, not the core conformance suite or a production SDK.

| Event | Signer | Result |
| --- | --- | --- |
| Request for one input token and up to two output tokens | buyer | Maximum budget 2,000 `usd:6` |
| Agreement at input/output rates of 1,000,000 per million tokens | provider | Reserve 2,000; worst-case charge is 1,000 because of the minimum |
| Commit one-token output and usage, then deliver Receipt | provider | Actual charge 1,000 |
| Validate complete output and acknowledge Receipt | buyer | `verification_pending` |
| Finalize `receipt_accepted` | buyer | `finalized_valid` |
| Issue pay instruction | buyer | Provider 1,000; buyer 1,000 |
| Commit simulated ledger entry | mock adapter | `settled` |

The same test file models sequential agreement deduplication, asset/scale changes, underfunding, output/usage substitution, accepted replays after expiry, delivery/acceptance windows, short-output challenge counts, late Opening observation for the optimistic profile, and closed policy registries. It does not test database races, transaction locks, restart durability, or external effects; those require integration tests in the future conformance suite alongside the full encoding/error matrices and independently implemented validation.
