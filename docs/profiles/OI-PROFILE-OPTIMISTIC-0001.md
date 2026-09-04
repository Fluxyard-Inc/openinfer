# OI-PROFILE-OPTIMISTIC-0001: Optimistic Trace Challenges

| Field | Value |
| --- | --- |
| Profile identifier | **oi.optimistic/0.1** |
| Status | **Experimental** |
| Core dependency | **oi-core/0.1** |
| Initial service dependency | **oi.inference/0.1** |
| Last updated | **2026-09-04** |

## 1. Scope

This assurance profile defines an implementable experiment for committing to selected inference checkpoints and opening unpredictable checkpoints after execution. It standardizes experiment inputs and verdicts; it does not claim that sampling proves a complete large-model execution.

No deployment may describe this profile as trustless, cryptographically proven inference, or production-ready.

## 2. Intended guarantee

The profile tests whether a provider can economically support this narrow claim:

> The delivered output is consistent with artifact X under execution profile Y, and the provider can correctly open unpredictable committed checkpoints at the rate and within the deadlines accepted by the agreement.

Passing sampled challenges does not prove that every unchallenged operation was correct. It does not prove which physical GPU performed the work unless another profile provides hardware attestation.

## 3. Agreement parameters

`Request.assurance_parameters` and the resulting agreement bind:

```json
{
  "commitment_suite": "oi.merkle-sha256/0.1",
  "checkpoint_profile": "oi.moe-transition/0.1",
  "challenge_source": {
    "profile": "oi.randomness.external/0.1",
    "source_id": "<agreed source>",
    "anchor_profile": "oi.anchor.external/0.1",
    "minimum_round": "12345",
    "round_rule": "first_round_after_anchor"
  },
  "challenge_count": "2",
  "challenge_window_seconds": "60",
  "opening_window_seconds": "120",
  "clock_skew_seconds": "5",
  "challenger": "oi:<digest>",
  "verifier_profile": "oi.verifier.moe-transition/0.1",
  "verifier": "oi:<digest>",
  "verdict_policy": "single-reference-verifier"
}
```

The provider MUST accept these values before execution. A gateway or verifier MUST NOT change them after the execution commitment is signed.

`single-reference-verifier` is permitted only for laboratory and Fluxyard shadow stages. An open market requires a separately specified deterministic verifier or quorum policy.

## 4. Checkpoint object

The initial MoE checkpoint profile is:

```json
{
  "checkpoint_profile": "oi.moe-transition/0.1",
  "index": "1842",
  "token_index": "17",
  "layer_index": "11",
  "input_activation_digest": "sha256:<digest>",
  "router_output_digest": "sha256:<digest>",
  "selected_expert_ids": ["3", "41"],
  "expert_output_digest": "sha256:<digest>",
  "output_activation_digest": "sha256:<digest>",
  "replay_context_digest": "sha256:<digest>"
}
```

`index` values are contiguous `UIntString` values beginning at `0`. The execution profile defines tensor shape, element representation, quantization, digest layout, routing rules, accepted numeric tolerance, and the contents of replay context. A checkpoint lacking those definitions is unverifiable and MUST be rejected.

## 5. Merkle commitment

`oi.merkle-sha256/0.1` uses ordered leaves:

```text
leaf_hash = SHA-256(0x00 || JCS(checkpoint))
node_hash = SHA-256(0x01 || left_32_bytes || right_32_bytes)
empty     = SHA-256(0x00)
```

Leaves are ordered by numeric checkpoint index. The tree is padded to the next power of two with `empty`. A single-leaf tree has that leaf as its root. An opening contains the checkpoint, its index, total unpadded leaf count, and ordered sibling hashes with an explicit `left` or `right` position.

The `ExecutionCommitment.commitment` object is:

```json
{
  "suite": "oi.merkle-sha256/0.1",
  "checkpoint_profile": "oi.moe-transition/0.1",
  "leaf_count": "4096",
  "root": "sha256:<digest>",
  "trace_byte_length": "983040",
  "trace_storage_digest": "sha256:<digest>"
}
```

The root proves only that the provider did not change the committed checkpoint set after signing.

## 6. Commitment anchoring and randomness

Before the selected randomness round becomes knowable, the provider MUST submit the signed execution-commitment digest to the agreed anchor profile. `Receipt.assurance_evidence` includes the resulting anchor:

```json
{
  "commitment_anchor": {
    "profile": "oi.anchor.external/0.1",
    "commitment_digest": "sha256:<digest>",
    "position": "738188",
    "evidence_digest": "sha256:<digest>"
  }
}
```

The challenge source produces `randomness_value` plus independently retrievable evidence identifying its source and round. The selected round MUST be the first source round both at or above `minimum_round` and strictly after the anchor position according to the source profile. No participant may substitute a later eligible round. The source profile MUST define a total ordering between anchor positions and rounds and MUST guarantee that the selected value was unpredictable when the anchor was accepted.

Challenge indices are derived deterministically:

```text
seed = SHA-256(
  UTF8("openinfer-challenge-v0.1\n")
  || commitment_digest_32_bytes
  || randomness_value
)

i = 0
while selected_count < challenge_count:
  candidate = UINT256(SHA-256(seed || U32BE(i)))
  limit = 2^256 - (2^256 mod leaf_count)
  i = i + 1
  if candidate >= limit: continue
  index = candidate mod leaf_count
  if index already selected: continue
  append index
```

`challenge_count` MUST NOT exceed `leaf_count`. Rejection sampling avoids modulo bias. Implementations MUST use unsigned big-endian integer interpretation.

An implementation MUST reject an unverifiable anchor or a source the provider could choose, grind, withhold, or predict before anchoring the commitment. The external anchor and randomness source for the first experiment remain explicit deployment choices, not universal protocol defaults.

## 7. Challenge

A `Challenge` payload is:

```json
{
  "receipt_digest": "sha256:<digest>",
  "commitment_digest": "sha256:<digest>",
  "assurance_profile": "oi.optimistic/0.1",
  "anchor_evidence_digest": "sha256:<digest>",
  "randomness_source": "oi.randomness.external/0.1",
  "randomness_round": "12345",
  "randomness_value": "<base64url bytes>",
  "randomness_evidence_digest": "sha256:<digest>",
  "selected_indices": ["1842", "2910"],
  "opening_deadline": "2026-09-04T00:05:00Z"
}
```

The Challenge envelope issuer MUST equal the agreed `challenger`. `challenge_deadline` is the earlier of `Receipt.completed_at + challenge_window_seconds` and `Agreement.verification_deadline`. `opening_deadline` is the earlier of the Challenge envelope `issued_at + opening_window_seconds` and `Agreement.verification_deadline`. A receiver MUST verify the anchor, deterministic eligible round, source evidence, selected indices, both deadlines, and that receipt and Challenge envelope timestamps were within `clock_skew_seconds` at their respective acceptance times. Any failure returns core `invalid_challenge` and MUST NOT change transaction state or authorize settlement against the provider.

## 8. Opening

An `Opening` payload is:

```json
{
  "receipt_digest": "sha256:<digest>",
  "challenge_digest": "sha256:<digest>",
  "assurance_profile": "oi.optimistic/0.1",
  "openings": [
    {
      "index": "1842",
      "checkpoint": {},
      "merkle_path": [
        {"position": "left", "digest": "sha256:<digest>"}
      ],
      "replay_input": {
        "media_type": "application/openinfer-moe-replay+json",
        "byte_length": "8192",
        "digest": "sha256:<digest>",
        "value": {}
      }
    }
  ]
}
```

The Opening envelope issuer MUST equal the Agreement provider. Every requested index appears exactly once. The opening MUST arrive by the agreed deadline. Replay input may be an encrypted reference when the verifier has the accepted decryption capability. A missing opening produces no Verdict; the authorized finalizer handles `opening_timeout` under the signed settlement policy.

## 9. Verification algorithm

For each opening, a verifier MUST:

1. validate the core envelopes and all referenced digests;
2. recompute the challenge indices;
3. hash the JCS checkpoint and verify its Merkle path to the committed root;
4. confirm checkpoint fields match the accepted execution and checkpoint profiles;
5. verify that replay input matches its digest and the checkpoint's replay-context digest;
6. recompute the selected router, expert, and output transition under the verifier profile;
7. compare the result using the accepted numeric rule; and
8. emit one closed reason code.

The verifier MUST process all selected indices even after finding one invalid opening so experiment reports can distinguish multiple failures. Settlement may stop at the first decisive invalid result.

## 10. Verdicts

The Verdict envelope issuer and payload `verifier` MUST equal the verifier identity accepted in the agreement.

The profile reason codes are:

```text
valid_opening
invalid_membership
wrong_checkpoint
wrong_profile
invalid_router_output
invalid_expert_selection
invalid_expert_output
invalid_transition
missing_replay_context
verifier_error
numeric_indeterminate
```

Reason codes map to core outcomes:

| Reason | Outcome |
| --- | --- |
| `valid_opening` for every index | `valid` |
| Any invalid membership, profile, routing, expert, or transition result | `invalid` |
| `verifier_error` or `numeric_indeterminate` | `indeterminate` |

Free-form explanations and logs may accompany the verdict but MUST NOT determine settlement.

## 11. Settlement behavior

Laboratory and shadow deployments MUST use simulated settlement. Before execution, the Request settlement policy MUST bind mappings for `valid`, `invalid`, `indeterminate`, `no_challenge`, `opening_timeout`, and `verifier_timeout`. After the challenge deadline, the authorized finalizer may emit `no_challenge` only if no valid Challenge was accepted. After the opening deadline, it may emit `opening_timeout` only if a valid Challenge was accepted and no valid Opening was accepted. After the verification deadline, it may emit `verifier_timeout` only if a valid Opening was accepted and no valid Verdict was accepted. Invalid Challenges and verifier failures MUST NOT become provider-invalid outcomes.

The profile does not define a token, stake asset, penalty size, challenger reward, or chain. Those parameters require measured audit cost and adversarial results.

## 12. Experiment measurements

Every run records:

- ordinary inference latency and throughput;
- commitment CPU, GPU, memory, storage, and bandwidth overhead;
- leaf count and checkpoint density;
- challenge latency, bytes, memory, and cost;
- honest numeric divergence;
- false-positive and false-negative results by attack type;
- provider opening failures and verifier errors; and
- computed fraud economics under stated assumptions.

The working research targets are less than 3% service overhead and less than 0.1% of original request cost for one transition. Missing either target does not create a protocol violation; it blocks maturity advancement.

## 13. Required attacks

The experiment suite includes at least:

1. honest reference execution;
2. lower precision or aggressive quantization;
3. skipped transformer layers;
4. fewer experts or altered MoE routing;
5. a smaller substitute model;
6. fabricated but internally consistent checkpoints;
7. changed data after commitment;
8. challenge grinding or withheld randomness; and
9. selective cheating based on request value or apparent audit likelihood.

Results are reported as detection curves, not a single accuracy number.

## 14. Privacy and security limitations

- Openings may expose activations, routing decisions, model structure, prompts, outputs, or proprietary state.
- A valid Merkle path proves membership, not correct execution.
- Sampling leaves unchallenged work unchecked.
- One verifier is a trusted component even when it is deterministic.
- A provider may deny service by refusing to open; settlement handles the failure but cannot restore liveness.
- Colluding providers, challengers, verifiers, randomness sources, or settlement adapters remain deployment threats.

## 15. Advancement gates

This profile remains experimental until:

1. honest numeric variance is bounded by a published checkpoint profile;
2. commitment and verification cost targets are measured on a named model and hardware configuration;
3. all required attacks have published results;
4. economic modeling finds a conservative negative-fraud-value region;
5. Fluxyard shadow mode survives replay, restart, timeout, and evidence gaps;
6. two independently implemented verifiers agree on the same fixtures and live openings; and
7. an external security review documents unresolved attacks.
