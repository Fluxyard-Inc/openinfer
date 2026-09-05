# OpenInfer Practical Research Plan

Status: proposed four-week pilot; no buyer demand, commercial viability, or verification results are implied. This replaces the E0–E7 execution-verification program. The earlier plan remains in Git history.

## Decision to make

Can one buyer repeatedly obtain a useful machine service from one known provider through Fluxyard, with a clear advantage over their current approach and acceptable delivery, cost, and operator effort?

The first outcome is a decision to continue, change the workload, or stop. Permissionless participation and decentralized verification are separate hypotheses, not requirements for this pilot. A working transaction does not establish demand for a marketplace or a new protocol.

## Operating scope

- One buyer with a recurring need, one known provider, and one bounded workload supported by Fluxyard's existing Docker execution path. Choose batch open-model inference only if it answers that need; no particular model family is required.
- One pilot owner accountable for buyer contact, delivery, costs, and the final decision. Record the buyer's acceptance contact and the provider's operations contact before starting.
- A human approves the provider, price, workload limits, and total pilot spending cap. Software submits work within those bounds. No autonomous expansion of purchasing authority.
- Fluxyard's Control Plane, database, operator, and selected provider remain trusted. Start with delivery checks, usage reconciliation, and direct problem resolution.
- Existing APIs, CLI, execution, and accounting paths first. Add only what blocks the selected transaction. A general gateway, new Runtime, heterogeneous scheduler, or full protocol implementation is not an entry requirement.
- OpenInfer settlement remains simulated. Any commercial pilot uses separately approved ordinary billing and must satisfy Fluxyard's current operational and production gates. Test-mode payments and signed mock receipts do not demonstrate willingness to pay.

## Week 1 — Establish a reason to use it

Speak with up to five plausible buyers about work they already perform. Select one recurring workload and document:

| Question | Required evidence |
| --- | --- |
| What is the work? | A representative input, expected output, workload size, and recurrence |
| What happens today? | Current provider or manual process, observed cost, delivery time, and specific difficulty |
| Why switch? | One buyer-valued advantage: access, cost, delivery, or less operating effort |
| What counts as delivery? | A buyer-approved output check, deadline, and failure/retry policy |
| What would they pay? | A quoted price and explicit acceptance, with discounts and subsidies recorded |
| What limits the experiment? | Named owner, start/end dates, spending cap, data access/retention rules, and maximum manual effort per job |

Agree numeric acceptance thresholds before running the pilot: delivery success rate, latency or completion deadline, total cost, and operator minutes per accepted job. Derive them from the buyer's current alternative rather than inventing universal targets. An unfilled field is a prerequisite to resolve, not a default approval.

**Gate:** one buyer agrees to try a representative job at a stated price, and a known provider can supply it within the spending cap. If no credible advantage or buyer emerges, pause the build and revise the offer; do not spend the remaining weeks on infrastructure.

## Week 2 — Deliver one accountable job

Run a supervised job through the existing Offer -> Job -> Allocation -> Worker report -> Usage -> Charge path. Retain the accepted terms, workload/artifact identity, result reference, usage evidence, outcome, and links to the Allocation. Record which facts were observed by the buyer/operator and which are provider claims.

Use the existing signed-receipt examples to explore a portable transaction record where that removes real coordination work. A pilot record is not automatically OpenInfer-conformant. If implementing the [signed-receipt profile](profiles/OI-PROFILE-SIGNED-RECEIPT-0001.md), preserve all required validation and state transitions; keep its settlement simulated. Add cross-language fixtures when a second implementation needs to consume the objects.

Before unattended retries or commercial delivery, reuse Fluxyard's existing checks and exercise the pilot's actual additions under duplicate submission, an unknown report outcome, restart, missing usage evidence, and provider failure. The result must remain traceable, without duplicate charges or silent evidence loss. A failure must have an explicit owner and disposition.

**Gate:** the buyer accepts the output under the agreed criteria, the record reconciles to the accepted terms, and failures can be handled within the agreed effort limit. A successful internal demonstration alone does not pass this gate.

## Week 3 — Test repeat use and full cost

Ask the same buyer to submit at least two further representative jobs on separate occasions. These are a minimum feasibility sample, not a statistical reliability claim. Keep the same acceptance criteria; record every failed, abandoned, retried, and subsidized job.

Measure the full cost of delivery, including provider compute, idle or reserved capacity, storage, transfer, retries, payment costs where applicable, audit compute, and operator time valued at an explicit rate. Separate measured costs from estimates and one-time setup from recurring work.

For each accepted job report:

```text
contribution = buyer revenue - provider payment - other variable delivery costs
              - audit costs - recurring operator labor
```

Include the costs of unsuccessful attempts when calculating contribution per accepted job. Do not count simulated settlement as revenue. Record actual paid revenue separately from quoted prices, accepted pilot commitments, and discounts; if commercial gates prevent payment, willingness to pay remains unconfirmed.

**Gate:** the buyer chooses repeat use, delivery meets the pre-agreed thresholds, and recurring contribution is positive at the accepted price or a specific measured operating bottleneck has a bounded, testable fix. If the case requires hidden subsidy or speculative future scale, record that as an unresolved business hypothesis.

## Week 4 — Make the decision

Produce one short report linking to the pilot brief, job records, costs, failures, and buyer feedback. Compare the result with the buyer's original alternative and select one outcome:

| Outcome | Next action |
| --- | --- |
| Repeat demand and acceptable delivery economics | Continue the narrow service; automate the most expensive demonstrated manual step |
| Repeat demand, with one fixable delivery or cost problem | Timebox that specific fix and rerun the same acceptance test |
| A specific unresolved trust problem blocks otherwise useful transactions | Authorize a bounded assurance comparison as described below |
| No repeat demand or convincing advantage | Pause or change the buyer/workload hypothesis; no automatic protocol expansion |

A technically successful pilot with no repeat demand does not justify a marketplace. Repeat demand without acceptable costs does not establish commercial viability. One buyer does not establish a broad market; expand to another buyer only after documenting what the first pilot supports.

## Evidence to retain

Keep one pilot brief, a per-job record, and the decision report using existing repository and accounting tools. No new analytics service is needed. Include source revisions, artifact digests, hardware/software configuration, accepted prices and limits, output acceptance, usage gaps, failures, costs, and operator minutes so another operator can understand each outcome.

Keep private inputs, outputs, credentials, and buyer identities out of public Git history. Store authorized references with defined access and retention. Publish sanitized aggregate findings and methods only where permitted. Missing observations remain unknown or incomplete; they are never successful delivery or proof of honest execution.

## When assurance research is justified

Reopen verification work only when a named buyer requirement or observed failure identifies a gap that known counterparties and ordinary delivery checks cannot adequately address. First state the exact claim: service quality, adherence to an advertised model configuration, usage accuracy, or correctness of a particular execution. Disclosed and accepted quantization is not a violation; accidental nonconformance and deliberate cheating need separate labels.

Choose the smallest relevant comparison on the same workload, honest configurations, and controlled violations:

1. **Operator audits:** representative task evaluations, production validity checks, usage reconciliation, and sampled replay. OpenRouter's [Auto Exacto documentation](https://openrouter.ai/docs/guides/routing/auto-exacto) is an example of recurring provider evaluation, not a proof of execution or absence of fraud.
2. **Reference-based output auditing:** reproduce an existing method such as [Token-DiFR](https://github.com/adamkarvonen/difr) if configuration fidelity is the unmet requirement. Pin tokenizer/template and sampling semantics; measure honest variation and reference-computation costs. Statistical divergence alone does not establish fraud.
3. **Intermediate evidence:** evaluate [TOPLOC](https://arxiv.org/abs/2501.16007) or the paused [optimistic profile](profiles/OI-PROFILE-OPTIMISTIC-0001.md) only if the simpler approaches leave a material gap.

Give that comparison its own owner, spending cap, timebox, and advance/stop decision. Predefine acceptable honest false-alarm rate, detection probability for specified violations, time or buyer exposure before detection, and aggregate cost. Use held-out workloads and repeated runs with uncertainty; separate cold and warm verifier costs and include loading, transfer, storage, and operational effort. Test selective cheating on recognizable audits and, where authorized, selection of ordinary recorded requests after delivery. Verifier failure or unavailable evidence must not be reported as a successful check or an automatic accusation of fraud.

For trace verification, test fabricated checkpoints and disconnected request/output evidence before optimizing overhead. Publish how each sampled computation binds to the actual request, prefix, output, and sampling decision. A valid Merkle path or locally consistent transition is insufficient. Evaluate reduced trace density against the same attacks; predictable omitted work is not automatically covered. Obtain independent implementation review of numeric rules and bindings early.

The former fixed commitment-overhead and single-transition-cost targets are retired. A candidate must improve the measured cost/detection tradeoff for the chosen workload, including residual risk and privacy constraints. Failure of a detector does not automatically authorize a more complex one.

## Deferred scope

Permissionless provider admission, decentralized settlement, staking/slashing, custom fraud proofs, broad multi-service standards, and heterogeneous scheduling are outside the pilot. The optimistic profile is paused experimental work, not the next delivery milestone. Revisit any of these only through a separately justified decision; successful known-provider transactions do not establish that permissionlessness is feasible or necessary.
