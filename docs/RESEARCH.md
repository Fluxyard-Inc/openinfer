# OpenInfer Research Plan: E0–E7

Status: research plan; no successful results are implied. These methods accompany [Draft 0001](PROTOCOL.md) and the [experimental optimistic profile](profiles/OI-PROFILE-OPTIMISTIC-0001.md).

Start without a blockchain, real stake, or public providers. Each stage publishes the source revision, model/artifact digests, hardware/software configuration, fixed corpus and seeds, control runs, raw measurements, uncertainty, failures, and a written advance/stop decision. The 3% commitment-overhead and 0.1% single-challenge-cost thresholds are research targets.

Use paired uninstrumented and instrumented runs on the same corpus; separate cold and warm verifier costs and record weight-loading/network time. Define the latency/throughput metric and cost denominator before evaluating a gate. Report distributions and confidence intervals across repeated runs rather than comparing one favorable sample. An unavailable dependency or missing observation is a failed/incomplete run, not evidence of correct inference.

## E0 — Freeze one verifiable execution profile

**Hypothesis:** one open MoE checkpoint can be described precisely enough that honest implementations expose comparable checkpoints.

**Method:** choose one accessible model from the open MoE families under consideration. Run a fixed prompt/seed corpus across two inference stacks and controlled variations in CUDA, kernels, parallelism, and quantization. Capture tokens, routes, selected activations, logits, latency, and throughput.

**Measure:** output divergence, route divergence, activation error distributions, reproducibility, and performance.

**Gate:** publish a profile that states which variables are fixed, which tolerate bounded error, and which make a distinct artifact. Stop exact-transition work if honest variation cannot be bounded without eliminating practical implementations.

## E1 — Measure trace-commitment overhead

**Hypothesis:** a provider can commit to enough intermediate state without materially degrading service.

**Method:** instrument the selected implementation to commit token/layer checkpoints, MoE routes, selected activation regions, and logit metadata into a Merkle tree. Compare no-trace, sampled-trace, and full candidate-trace modes on short, long, and high-context requests.

**Measure:** time to first token, tokens per second, total latency, GPU memory, CPU cost, committed bytes, proof bytes, and trace storage.

**Gate:** target less than 3% throughput or latency overhead at the chosen trace density. If the target fails, reduce the trace, batch hashing, change the commitment layout, or reject this design.

## E2 — Recompute one challenged transition

**Hypothesis:** a verifier can check one unpredictable checkpoint without loading or rerunning most of the original model request.

**Method:** after the trace root is locked, derive a challenge for one token, layer, expert set, and vector region. Open the Merkle path and minimum input state. Recompute the transition with an independent verifier.

**Measure:** verifier model state required, bytes transferred, compute time, accelerator memory, end-to-end challenge latency, and cost relative to the original request.

**Gate:** target less than 0.1% of original request cost for one transition. If verification requires most model weights or context, stop the simple sampling design and evaluate interactive localization, replication, TEEs, or proof systems.

## E3 — Define numeric correctness

**Hypothesis:** honest GPU implementations can be judged without requiring raw floating-point bit equality.

**Method:** compare exact replay, bounded-error replay, and deterministically quantized checkpoint representations. Vary reduction order, tensor/expert parallelism, precision, normalization, and kernel implementation.

**Measure:** honest false-positive rate, adversarial false-negative rate, tolerance stability, verifier complexity, and performance impact.

**Gate:** choose one rule with a measured low honest-failure rate and useful adversarial separation. If no rule survives implementation variance, optimistic transition verification is not ready.

## E4 — Attack the verifier

**Hypothesis:** post-commit sampling detects economically meaningful shortcuts while accepting honest providers.

**Method:** run an adversary suite:

1. honest reference execution;
2. lower precision or aggressive quantization;
3. skipped transformer layers;
4. fewer experts or altered MoE routing;
5. a smaller substitute model;
6. selective cheating that becomes honest when a request appears likely to be audited;
7. a fixed trace paired with a different same-length output or changed usage after anchoring; and
8. fabricated internally consistent checkpoints disconnected from the request or returned token sequence.

Stratify requests by prompt length, output length, context size, time, provider load, and transaction value.

**Measure:** false positives, false negatives, time to detection, fraction of corrupt work before detection, proof failures, and attack profitability.

**Gate:** publish detection curves rather than one headline accuracy. Do not proceed to real stake while any tested shortcut is both profitable and unlikely to be caught.

## E5 — Model audit and staking economics

**Hypothesis:** plausible audit rates, challenge rewards, and stake can make expected fraud value negative without making honest service uneconomic.

**Method:** combine E1–E4 measurements with provider margin, verifier cost, challenge frequency, selective-cheating strategies, collusion, false challenges, and capital cost. Simulate random and stratified audit policies.

**Measure:** network verification overhead, provider capital requirement, verifier return, griefing cost, detection probability, buyer loss before detection, and expected fraud value.

**Gate:** identify at least one robust parameter region under conservative assumptions. If security depends on implausible stake or verifier subsidy, keep the assurance profile experimental.

## E6 — Integrate a shadow protocol through Fluxyard

**Hypothesis:** the open objects can reuse Fluxyard's execution and accounting spine without weakening replay, evidence-gap, or exactly-once guarantees.

**Method:** map signed `Offer`, `Request`, `Agreement`, `Receipt`, and `ExecutionCommitment` objects onto the existing Offer -> Job -> Allocation -> Worker report -> Usage -> Charge path. Run post-commit challenges and shadow verdicts, but keep payments and slashing in sandbox or simulated ledgers.

**Measure:** duplicate effects under lost acknowledgements, changed-replay rejection, receipt-to-allocation traceability, challenge timeout recovery, evidence-gap handling, settlement idempotency, and operator effort.

**Gate:** one end-to-end request must survive Control Plane and Worker restart, an unknown report outcome, duplicate delivery, verifier timeout, and a usage gap without duplicate settlement or silent evidence loss.

## E7 — Independent challenger rehearsal

Run only if E0–E6 pass. Two independently implemented verifiers receive the same receipt, randomness, and opening. Measure deterministic agreement, bandwidth, latency, and conflicting-verdict handling. Open rewards and penalties remain simulated until verifier diversity and dispute resolution are credible.
