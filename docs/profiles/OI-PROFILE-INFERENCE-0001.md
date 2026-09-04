# OI-PROFILE-INFERENCE-0001: Open-Model Inference

| Field | Value |
| --- | --- |
| Profile identifier | **oi.inference/0.2** |
| Status | **Implementable Baseline** |
| Core dependency | **oi-core/0.2** |
| Last updated | **2026-09-04** |

## 1. Scope

This service profile defines how a buyer purchases text-generation inference for a precisely identified open model artifact. It defines offer terms, execution profiles, requests, usage, performance claims, and receipts. It does not prove faithful model execution; assurance profiles provide that evidence.

## 2. Conformance

An implementation conforms to `oi.inference/0.2` when it:

1. implements `oi-core/0.2`;
2. validates every field and bound defined here;
3. computes artifact, input, output, and usage digests deterministically;
4. produces the same usage totals for the profile's tokenizer fixtures; and
5. rejects an agreement or receipt that changes the accepted execution profile.

Unknown profile fields MUST be rejected.

## 3. Execution profile

An inference `ExecutionProfile` payload identifies the artifact and numeric behavior being sold:

| Field | Type | Rule |
| --- | --- | --- |
| `profile_id` | string | Provider-chosen identifier |
| `profile_revision` | `UIntString` | Increased for any changed field |
| `provider` | identity | MUST equal the envelope issuer |
| `model_family` | string | Human-readable only; not identity |
| `weights_manifest_digest` | digest | Digest of ordered file names, sizes, and file digests |
| `tokenizer_digest` | digest | Tokenizer files plus normalization configuration |
| `prompt_template_digest` | digest | Exact prompt rendering rules |
| `quantization` | string | Closed profile value such as `bf16` or `int8-profile-a` |
| `runtime_profile` | string | Versioned runtime constraints |
| `numeric_profile` | string | Accumulator precision, rounding, normalization, and tolerance rules |
| `sampling_profile` | string | Versioned sampling algorithm and seed semantics |
| `context_limit_tokens` | `UIntString` | Maximum rendered input plus output tokens |
| `layer_count` | `PositiveUIntString` | Number of model layers executed per token |
| `trace_profiles` | array of `ProfileId` | Assurance-compatible trace schemas; empty when none |
| `manifest_uri` | string or `null` | Retrieval hint; digest remains authoritative |

The tuple `(provider, profile_id, profile_revision)` MUST map to one envelope digest. Two profiles with different weights, tokenizers, templates, quantization, runtime behavior relevant to verification, or numeric rules are different artifacts even if they share a marketing model name.

### 3.1 Weights manifest

The weights manifest is a JCS object containing an ordered `files` array. Each entry contains `path`, `byte_length`, and `sha256`. Paths MUST be relative, use `/`, contain no empty, `.` or `..` segment, and be unique. The manifest digest is computed under the core suite.

## 4. Offer terms

An inference `Offer.terms` payload is:

```json
{
  "execution_profile_digest": "sha256:<digest>",
  "price": {
    "asset": "usd:6",
    "input_per_million": "200000",
    "output_per_million": "800000",
    "minimum_charge": "1000",
    "maximum_charge": "50000000"
  },
  "limits": {
    "maximum_input_tokens": "131072",
    "maximum_output_tokens": "8192",
    "maximum_concurrent_requests": "8"
  },
  "performance_claim": {
    "maximum_ttft_ms": "500",
    "minimum_output_tokens_per_second_milli": "20000"
  },
  "input_modes": ["inline", "encrypted_ref"],
  "output_modes": ["inline", "encrypted_ref"]
}
```

All prices are integer asset minor units per one million tokens. Performance values are claims attributable to the provider; they are not proof.
`minimum_charge` MUST NOT exceed `maximum_charge`. The asset identifier, including its unit scale, MUST be identical in `Offer.terms.price.asset`, `Request.settlement_asset`, `Agreement.settlement_asset`, and `SettlementInstruction.asset`. This profile performs no currency or unit conversion; a request mismatch is `profile_mismatch`, and an instruction mismatch is `settlement_conflict`.

## 5. Inference request

`Request.service_request` is:

```json
{
  "execution_profile_digest": "sha256:<digest>",
  "input": {
    "mode": "inline",
    "media_type": "application/openinfer-prompt+json",
    "byte_length": "1532",
    "source_digest": "sha256:<digest>",
    "value": {
      "messages": [
        {"role": "user", "content": "Explain the result."}
      ]
    },
    "uri": null,
    "encryption_profile": null,
    "recipient_key_id": null
  },
  "rendered_input_digest": "sha256:<digest>",
  "generation": {
    "maximum_output_tokens": "512",
    "temperature_milli": "700",
    "top_p_millionths": "950000",
    "seed": "42",
    "stop": []
  },
  "output_mode": "inline"
}
```

### 5.1 Input modes

- `inline` uses a non-null `value` and null `uri`, `encryption_profile`, and `recipient_key_id`; `source_bytes = UTF8(JCS(value))`, `byte_length` is the length of `source_bytes`, and its core digest MUST equal `input.source_digest`.
- `encrypted_ref` uses null `value` and non-null `uri`, `encryption_profile`, and `recipient_key_id`. The decrypted canonical source bytes MUST match `byte_length` and `input.source_digest`.

The committed tokenizer and prompt template render the source into `{ "media_type": "application/openinfer-token-ids+json", "token_ids": [...] }`. `rendered_input_digest` is the core digest of that JCS object. `ExecutionCommitment.input_digest` and `Receipt.input_digest` MUST equal `rendered_input_digest`; `source_digest` separately commits to the buyer-supplied source.

### 5.2 Generation parameters

- `maximum_output_tokens` is a positive `UIntString` within offer limits.
- `temperature_milli` is an integer from `0` through `2000` represented as `UIntString`.
- `top_p_millionths` is an integer from `1` through `1000000` represented as `UIntString`.
- `seed` is a `UIntString`. Seed interpretation is fixed by the execution profile.
- `stop` contains at most 16 unique UTF-8 strings, each at most 256 bytes.

Integer-scaled parameters avoid cross-language floating-point serialization ambiguity. A request requiring a parameter not defined here needs a new profile revision.

Before accepting a Request, the receiver MUST verify that rendered input length is within the offer's input limit, the requested input/output modes are advertised, and rendered input tokens plus `generation.maximum_output_tokens` do not exceed the execution profile's context limit. Receipts MUST NOT claim more output tokens than the requested maximum.

`Request.service_request.execution_profile_digest` MUST equal `Offer.terms.execution_profile_digest` in the exact Offer referenced by `Request.offer_digest`.

## 6. Output

The provider returns an output object before creating the receipt:

```json
{
  "media_type": "application/openinfer-completion+json",
  "finish_reason": "stop",
  "text": "...",
  "token_ids": ["101", "202"],
  "byte_length": "3"
}
```

`finish_reason` is `stop`, `length`, `content_filter`, `cancelled`, or `error`. Token IDs are `UIntString` values. `byte_length` is the UTF-8 byte length of `text`. The output digest is the core digest of the JCS output object.

An encrypted output uses an encrypted reference in transport, but the receipt still commits to the digest of the decrypted profile object.

## 7. Usage

Usage is calculated with the tokenizer and prompt template committed by the execution profile:

```json
{
  "input_tokens": "128",
  "output_tokens": "64",
  "total_tokens": "192",
  "metering_profile": "oi.inference.tokens/0.1"
}
```

The following rules are normative:

1. `input_tokens` counts the fully rendered prompt after the committed prompt template.
2. `output_tokens` counts generated token IDs returned by the execution, including a generated stop token when the sampling profile emits one.
3. `total_tokens` equals the decimal sum of input and output tokens.
4. Retries internal to the provider are not billable unless a different metering profile was accepted in the agreement.
5. A streaming disconnect does not change generated usage, but this baseline requires the buyer to retrieve the complete committed output before ReceiptAcceptance. Undelivered output cannot be charged under this profile; a different delivery policy requires another profile.

The buyer MUST recompute usage from the committed tokenizer, rendered input, and output token IDs before authorizing ReceiptAcceptance. Text alone is insufficient when multiple token sequences can render the same text.

## 8. Performance

Receipt performance claims are:

```json
{
  "queue_ms": "12",
  "time_to_first_token_ms": "184",
  "generation_ms": "3180",
  "output_tokens_per_second_milli": "20125"
}
```

All durations are non-negative integer milliseconds. Throughput is output tokens per second multiplied by 1000 and rounded down. A reported value that violates the bound in `Offer.terms.performance_claim` is `performance_claim_failed`. Provider clock claims remain untrusted unless an assurance profile defines independent observation.

## 9. Receipt requirements

An inference `Receipt` uses the core fields and MUST additionally satisfy:

- `service_profile` is `oi.inference/0.2`;
- `execution_profile_digest` matches the Offer terms bound by `Agreement.offer_digest`, the Request, and the commitment;
- `input_digest` matches the rendered input committed by the request;
- `output_digest` matches the profile output object;
- `usage` conforms to section 7;
- `performance` conforms to section 8; and
- `Agreement.issued_at <= started_at <= completed_at <= ExecutionCommitment.issued_at <= Receipt.issued_at <= Agreement.receipt_deadline`; and
- output and usage digests match the accepted commitment before any assurance verification begins.

A changed tokenizer, prompt template, quantization, sampling profile, or seed is `profile_mismatch`, not a harmless implementation detail.

For the baseline mock policy, `settlement_policy.finalizer` MUST equal the buyer. A usage mismatch is `usage_mismatch` and prevents ReceiptAcceptance.

## 10. Settlement amount

For the baseline price object:

```text
input_charge  = floor(input_tokens  * input_per_million  / 1_000_000)
output_charge = floor(output_tokens * output_per_million / 1_000_000)
raw_charge    = input_charge + output_charge
charge        = min(max(raw_charge, minimum_charge), maximum_charge)
```

At Agreement acceptance, the buyer and provider MUST compute `required_reservation` with the same formula, substituting the verified rendered input-token count and `Request.service_request.generation.maximum_output_tokens`. They MUST require `required_reservation <= accepted_amount <= Request.maximum_amount`. Failure returns `profile_mismatch` before establishing a transaction or performing work. The provider cannot accept an insufficient reservation and rely on a later budget increase; this version has no budget amendment. Because prices are non-negative and accepted usage cannot exceed those counts, every permitted successful output fits the reservation.

All operations use arbitrary-precision non-negative integers. The computed charge MUST NOT exceed the agreement's accepted amount. For a `pay` or `split` instruction after valid delivery, `provider_amount` MUST equal `charge` and `buyer_amount` MUST equal `accepted_amount - charge`. A mismatch is `settlement_conflict`.

## 11. Receipt validation errors

The baseline service-profile validation codes are:

```text
invalid_execution_profile
input_digest_mismatch
output_digest_mismatch
usage_mismatch
performance_claim_failed
```

These codes reject the Receipt without a state transition; they are not Finalization reasons and MUST NOT directly authorize settlement. If no timely delivered Receipt is validated and accepted by `Agreement.acceptance_deadline`, the core `receipt_timeout` rule applies. A `cancelled` or `error` output cannot receive a baseline `ReceiptAcceptance`. The service profile does not introduce slashing.

## 12. Privacy and security

- Public discovery MUST NOT include prompts or outputs.
- A receipt SHOULD expose only input and output digests plus bounded usage and performance metadata.
- Third parties cannot verify usage without a disclosure-capable assurance profile; baseline usage validation is performed by the buyer before Receipt acceptance.
- Providers MUST treat referenced input locations and decryption material as transaction secrets.
- Buyers MUST NOT infer faithful model execution from a matching output digest or usage total alone.
- Hosting untrusted workloads requires isolation stronger than a profile document; this profile makes no sandbox-security claim.

## 13. Required fixtures

Candidate status requires:

1. a weights-manifest digest fixture;
2. prompt-template and tokenizer fixtures with exact token IDs;
3. input and output digest fixtures;
4. price calculations at zero, minimum, ordinary, and maximum bounds;
5. streaming-disconnect usage cases;
6. invalid generation-parameter cases; and
7. two independent implementations producing identical receipts.
