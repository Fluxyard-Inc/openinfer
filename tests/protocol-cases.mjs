// Runnable specification examples, not a production validator or full conformance suite.
// Only the fixture's ASCII/string-only JCS subset is exercised. Keys are public test keys.
import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('base64url')}`;
function jcs(value) {
  assert.notEqual(typeof value, 'number', 'signed fixture numbers must be strings');
  if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${jcs(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = value => digest(jcs(value));
const timestamp = seconds => new Date(Date.UTC(2026, 8, 4) + seconds * 1000).toISOString().replace('.000Z', 'Z');
const domain = 'openinfer-signed-envelope-v0.2\n';
function actor(name) {
  const seed = createHash('sha256').update(`OPENINFER PUBLIC TEST KEY: ${name}`).digest();
  const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' });
  const publicKey = createPublicKey(privateKey);
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  return { privateKey, publicKey, raw, identity: `oi:${digest(raw).slice(7)}`, sequence: 0 };
}
const buyer = actor('buyer'), provider = actor('provider'), adapter = actor('adapter');
const actors = [buyer, provider, adapter];
const objects = [];
function emit(kind, issuer, payload, issuedAt = timestamp(objects.length + 1), expiresAt = timestamp(600)) {
  const envelope = { network_id: 'openinfer-testnet-1', protocol: 'oi-core/0.2', suite: 'oi-suite-jcs-ed25519-sha256/0.1', kind,
    issuer: issuer.identity, key_id: `${issuer.identity}#0`, sequence: String(++issuer.sequence), issued_at: issuedAt,
    expires_at: expiresAt, payload_digest: hash(payload), payload };
  const input = domain + jcs(envelope);
  const object = { digest: digest(input), envelope: { ...envelope, signature: sign(null, Buffer.from(input), issuer.privateKey).toString('base64url') } };
  objects.push(object);
  return object;
}
function authenticate(object) {
  const { signature, ...envelope } = object.envelope;
  const signer = actors.find(a => a.identity === envelope.issuer);
  assert(signer);
  assert.equal(envelope.key_id, `${signer.identity}#0`);
  assert.equal(envelope.payload_digest, hash(envelope.payload));
  assert.equal(object.digest, digest(domain + jcs(envelope)));
  assert(verify(null, Buffer.from(domain + jcs(envelope)), signer.publicKey, Buffer.from(signature, 'base64url')));
}
const P = object => object.envelope.payload;
const coreReasons = { commitment_timeout: 'refund', receipt_timeout: 'refund' };
const signedReasons = { ...coreReasons, receipt_accepted: 'pay' };
const optimisticReasons = { ...coreReasons, no_challenge: 'pay', opening_timeout: 'refund', verifier_timeout: 'hold', valid_verdict: 'pay', invalid_verdict: 'refund', indeterminate_verdict: 'hold' };
function policyMatches(actual, expected) { assert.equal(jcs(actual), jcs(expected), 'profile_mismatch'); }
function charge(input, output, price) {
  const raw = BigInt(input) * BigInt(price.input_per_million) / 1000000n + BigInt(output) * BigInt(price.output_per_million) / 1000000n;
  return [raw < BigInt(price.minimum_charge) ? BigInt(price.minimum_charge) : raw, BigInt(price.maximum_charge)].reduce((a, b) => a < b ? a : b);
}
function validateAssets(offer, request, agreement, instruction) {
  assert.equal(request.settlement_asset, offer.terms.price.asset, 'profile_mismatch');
  assert.equal(agreement.settlement_asset, request.settlement_asset, 'profile_mismatch');
  if (instruction) assert.equal(instruction.asset, agreement.settlement_asset, 'settlement_conflict');
}
function acceptAgreement(ledger, offer, request, agreement, inputCount) {
  const requestKey = jcs([agreement.envelope.network_id, request.buyer, request.request_id]);
  const agreementKey = jcs([agreement.envelope.network_id, P(agreement).provider, P(agreement).agreement_id]);
  // Atomic compare-and-set model; a real receiver needs the §7.4 database transaction.
  for (const key of [requestKey, agreementKey]) {
    const prior = ledger.get(key);
    if (prior) assert.equal(prior.digest, agreement.digest, 'replay_conflict');
  }
  if (ledger.has(requestKey)) return ledger.get(requestKey);
  validateAssets(offer, request, P(agreement));
  const required = charge(inputCount, request.service_request.generation.maximum_output_tokens, offer.terms.price);
  assert(required <= BigInt(P(agreement).accepted_amount) && BigInt(P(agreement).accepted_amount) <= BigInt(request.maximum_amount), 'profile_mismatch');
  for (const key of [requestKey, agreementKey]) ledger.set(key, agreement);
  return agreement;
}
function checkCommitment(commitment, receipt, output) {
  assert.equal(receipt.output_digest, hash(output), 'output_digest_mismatch');
  assert.equal(receipt.output_digest, commitment.output_digest, 'profile_mismatch');
  assert.equal(hash(receipt.usage), commitment.usage_digest, 'profile_mismatch');
}
function replay(store, object, now) {
  authenticate(object);
  const e = object.envelope, key = jcs([e.network_id, e.issuer, e.kind, e.sequence]);
  if (store.has(key)) {
    assert.equal(store.get(key).digest, object.digest, 'replay_conflict');
    return store.get(key);
  }
  assert(now < e.expires_at, 'expired');
  const result = { digest: object.digest, result: 'accepted' };
  store.set(key, result);
  return result;
}
function checkReceiptAcceptance(receipt, agreement, acceptance) {
  const observed = P(acceptance).receipt_observed_at;
  assert(receipt.envelope.issued_at <= observed && observed <= P(agreement).receipt_deadline, 'deadline_exceeded');
  assert(observed <= acceptance.envelope.issued_at && acceptance.envelope.issued_at <= P(agreement).acceptance_deadline, 'deadline_exceeded');
}
function challengeIndices(leafCount, budget, seed) {
  const leaves = BigInt(leafCount), requested = BigInt(budget);
  assert(leaves >= 1n && leaves <= 4294967296n && requested >= 1n && requested <= 1024n, 'profile_mismatch');
  const effective = Number(requested < leaves ? requested : leaves);
  const selected = new Set(), maximumDraws = 64 * effective + 128;
  const limit = (1n << 256n) - (1n << 256n) % leaves;
  for (let i = 0; i < maximumDraws && selected.size < effective; i++) {
    const counter = Buffer.alloc(4); counter.writeUInt32BE(i);
    const candidate = BigInt('0x' + createHash('sha256').update(seed).update(counter).digest('hex'));
    if (candidate < limit) selected.add(String(candidate % leaves));
  }
  assert.equal(selected.size, effective, 'temporarily_unavailable');
  return [...selected];
}
function observeOpening(state, issued, observed, deadline) {
  assert.equal(state.value, 'disputed');
  assert(issued <= observed && observed <= deadline, 'deadline_exceeded');
  state.value = 'opened';
}

// Full synthetic transaction: these fixture artifact definitions are intentionally not a real model.
const source = { messages: [{ role: 'user', content: 'hello' }] };
const renderedInput = { media_type: 'application/openinfer-token-ids+json', token_ids: ['1'] };
const output = { media_type: 'application/openinfer-completion+json', finish_reason: 'stop', text: 'OK', token_ids: ['2'], byte_length: '2' };
const tokenizer = { profile: 'fixture.tokenizer/0.1', tokens: { hello: '1', OK: '2' } };
const template = { profile: 'fixture.single-user/0.1', rule: 'Render the single user message without extra tokens.' };
const weights = 'synthetic model: token 1 deterministically emits token 2';
const manifest = { files: [{ path: 'fixture.txt', byte_length: String(Buffer.byteLength(weights)), sha256: digest(weights) }] };
for (const a of actors) emit('identity_document', a, { identity: a.identity, keys: [{ key_id: `${a.identity}#0`, purpose: ['signing'], public_key: a.raw.toString('base64url') }] });
const execution = emit('execution_profile', provider, { profile_id: 'synthetic-one-token', profile_revision: '0', provider: provider.identity, model_family: 'fixture-only', weights_manifest_digest: hash(manifest), tokenizer_digest: hash(tokenizer), prompt_template_digest: hash(template), quantization: 'bf16', runtime_profile: 'fixture.lookup/0.1', numeric_profile: 'fixture.exact/0.1', sampling_profile: 'fixture.greedy/0.1', context_limit_tokens: '16', layer_count: '1', trace_profiles: [], manifest_uri: null });
const capability = emit('capability_statement', provider, { capability_id: 'fixture', revision: '0', provider: provider.identity, service_profiles: ['oi.inference/0.2'], execution_profile_digests: [execution.digest], valid_from: timestamp(0), valid_until: timestamp(600) });
const offer = emit('offer', provider, { offer_id: 'fixture-offer', revision: '0', provider: provider.identity, service_profile: 'oi.inference/0.2', capability_digest: capability.digest, terms: { execution_profile_digest: execution.digest, price: { asset: 'usd:6', input_per_million: '1000000', output_per_million: '1000000', minimum_charge: '1000', maximum_charge: '100000' }, limits: { maximum_input_tokens: '8', maximum_output_tokens: '2', maximum_concurrent_requests: '1' }, performance_claim: { maximum_ttft_ms: '500', minimum_output_tokens_per_second_milli: '1000' }, input_modes: ['inline'], output_modes: ['inline'] }, assurance_profiles: ['oi.signed-receipt/0.1'], valid_from: timestamp(0), valid_until: timestamp(600) });
const policy = { profile: 'oi.settlement-policy.mock/0.2', finalizer: buyer.identity, instruction_issuer: buyer.identity, adapter: 'oi.settlement.mock/0.1', adapter_identity: adapter.identity, reason_map: signedReasons };
const request = emit('request', buyer, { request_id: 'purchase-1', buyer: buyer.identity, service_profile: 'oi.inference/0.2', offer_digest: offer.digest, service_request: { execution_profile_digest: execution.digest, input: { mode: 'inline', media_type: 'application/openinfer-prompt+json', byte_length: String(Buffer.byteLength(jcs(source))), source_digest: hash(source), value: source, uri: null, encryption_profile: null, recipient_key_id: null }, rendered_input_digest: hash(renderedInput), generation: { maximum_output_tokens: '2', temperature_milli: '0', top_p_millionths: '1000000', seed: '0', stop: [] }, output_mode: 'inline' }, assurance_profile: 'oi.signed-receipt/0.1', assurance_parameters: {}, settlement_asset: 'usd:6', maximum_amount: '2000', settlement_policy: policy, minimum_commit_window_seconds: '10', minimum_receipt_window_seconds: '10', minimum_acceptance_window_seconds: '10', nonce: Buffer.alloc(16, 1).toString('base64url'), expires_at: timestamp(300) }, undefined, timestamp(300));
const agreement = emit('agreement', provider, { agreement_id: 'agreement-1', request_digest: request.digest, offer_digest: offer.digest, buyer: buyer.identity, provider: provider.identity, service_profile: 'oi.inference/0.2', assurance_profile: 'oi.signed-receipt/0.1', accepted_amount: '2000', settlement_asset: 'usd:6', settlement_policy_digest: hash(policy), commit_deadline: timestamp(60), receipt_deadline: timestamp(120), acceptance_deadline: timestamp(150), verification_deadline: timestamp(150) });
const ledger = new Map();
acceptAgreement(ledger, P(offer), P(request), agreement, '1');
const usage = { input_tokens: '1', output_tokens: '1', total_tokens: '2', metering_profile: 'oi.inference.tokens/0.1' };
const commitment = emit('execution_commitment', provider, { agreement_digest: agreement.digest, provider: provider.identity, service_profile: 'oi.inference/0.2', assurance_profile: 'oi.signed-receipt/0.1', execution_profile_digest: execution.digest, input_digest: hash(renderedInput), output_digest: hash(output), usage_digest: hash(usage), commitment_profile: null, commitment: null });
const receipt = emit('receipt', provider, { agreement_digest: agreement.digest, commitment_digest: commitment.digest, provider: provider.identity, service_profile: 'oi.inference/0.2', execution_profile_digest: execution.digest, input_digest: hash(renderedInput), output_digest: hash(output), usage, performance: { queue_ms: '0', time_to_first_token_ms: '1', generation_ms: '1', output_tokens_per_second_milli: '1000000' }, assurance_profile: 'oi.signed-receipt/0.1', assurance_evidence: null, started_at: agreement.envelope.issued_at, completed_at: commitment.envelope.issued_at });
checkCommitment(P(commitment), P(receipt), output);
const acceptance = emit('receipt_acceptance', buyer, { agreement_digest: agreement.digest, receipt_digest: receipt.digest, receipt_observed_at: receipt.envelope.issued_at });
checkReceiptAcceptance(receipt, agreement, acceptance);
const finalization = emit('finalization', buyer, { agreement_digest: agreement.digest, receipt_digest: receipt.digest, evidence_digest: acceptance.digest, revision: '0', supersedes_digest: null, outcome: 'valid', reason_code: 'receipt_accepted' });
const paid = charge('1', '1', P(offer).terms.price);
const instruction = emit('settlement_instruction', buyer, { agreement_digest: agreement.digest, finalization_digest: finalization.digest, instruction_revision: '0', supersedes_instruction_digest: null, outcome: 'pay', asset: 'usd:6', provider_amount: String(paid), buyer_amount: String(BigInt(P(agreement).accepted_amount) - paid), adapter: 'oi.settlement.mock/0.1', idempotency_key: `settlement:${finalization.digest}:0` });
emit('settlement_receipt', adapter, { instruction_digest: instruction.digest, adapter: 'oi.settlement.mock/0.1', adapter_operation_id: 'mock-entry-1', result: 'committed', external_reference: 'mock:entry-1', observed_at: timestamp(objects.length + 1) });
const transcript = { fixture_only: true, artifacts: { weights, manifest, tokenizer, template, source, rendered_input: renderedInput, output }, objects: [...objects] };

for (const object of transcript.objects) authenticate(object);
validateAssets(P(offer), P(request), P(agreement), P(instruction));
assert.equal(BigInt(P(instruction).provider_amount) + BigInt(P(instruction).buyer_amount), 2000n);
assert.equal(paid, 1000n);
policyMatches(policy.reason_map, signedReasons);
assert.equal(acceptAgreement(ledger, P(offer), P(request), agreement, '1'), agreement);

// R1: two separately signed acceptances cannot establish two purchases.
const second = emit('agreement', provider, { ...P(agreement), agreement_id: 'agreement-2' });
assert.throws(() => acceptAgreement(ledger, P(offer), P(request), second, '1'), /replay_conflict/);
// This is a sequential compare-and-set example, not a database race/locking test.
// R2: reject both currency and scale changes at request and instruction boundaries.
for (const asset of ['eur:6', 'usd:2']) {
  assert.throws(() => validateAssets(P(offer), { ...P(request), settlement_asset: asset }, { ...P(agreement), settlement_asset: asset }), /profile_mismatch/);
  assert.throws(() => validateAssets(P(offer), P(request), P(agreement), { ...P(instruction), asset }), /settlement_conflict/);
}
assert.throws(() => validateAssets(P(offer), P(request), { ...P(agreement), settlement_asset: 'eur:6' }), /profile_mismatch/);
// R3: replacing output with the same token count cannot reuse a commitment.
const substitute = { ...output, text: 'NO', token_ids: ['3'] };
assert.throws(() => checkCommitment(P(commitment), { ...P(receipt), output_digest: hash(substitute) }, substitute), /profile_mismatch/);
assert.throws(() => checkCommitment(P(commitment), { ...P(receipt), usage: { ...usage, output_tokens: '2', total_tokens: '3' } }, output), /profile_mismatch/);
// R4: a false issuance claim never consumes the opening-timeout state.
const late = { value: 'disputed' };
assert.throws(() => observeOpening(late, 119, 180, 120), /deadline_exceeded/);
assert.equal(late.value, 'disputed');
const onTime = { value: 'disputed' };
observeOpening(onTime, 119, 120, 120);
assert.equal(onTime.value, 'opened');
// R5: exact accepted replay after expiry returns the original result.
const replayStore = new Map(), originalResult = replay(replayStore, instruction, timestamp(30));
assert.equal(replay(replayStore, instruction, timestamp(900)), originalResult);
assert.throws(() => replay(new Map(), instruction, timestamp(900)), /expired/);
const changedReplay = emit('settlement_instruction', buyer, { ...P(instruction), provider_amount: '999', buyer_amount: '1001' });
const { signature: ignored, ...changedEnvelope } = changedReplay.envelope;
changedEnvelope.sequence = instruction.envelope.sequence;
const changedInput = domain + jcs(changedEnvelope);
const changed = { digest: digest(changedInput), envelope: { ...changedEnvelope, signature: sign(null, Buffer.from(changedInput), buyer.privateKey).toString('base64url') } };
assert.throws(() => replay(replayStore, changed, timestamp(900)), /replay_conflict/);
// R6: all eight optimistic keys are required; no extra keys/actions are permitted.
policyMatches(optimisticReasons, optimisticReasons);
for (const key of Object.keys(optimisticReasons)) {
  const missing = { ...optimisticReasons }; delete missing[key];
  assert.throws(() => policyMatches(missing, optimisticReasons), /profile_mismatch/);
}
assert.throws(() => policyMatches({ ...optimisticReasons, made_up: 'pay' }, optimisticReasons), /profile_mismatch/);
assert.throws(() => policyMatches({ ...optimisticReasons, receipt_timeout: 'pay' }, optimisticReasons), /profile_mismatch/);
// R7: reject reservations below the minimum and below the permitted output cost.
const zero = emit('agreement', provider, { ...P(agreement), accepted_amount: '0' });
assert.throws(() => acceptAgreement(new Map(), P(offer), P(request), zero, '1'), /profile_mismatch/);
const highRate = { ...P(offer), terms: { ...P(offer).terms, price: { ...P(offer).terms.price, output_per_million: '2000000000' } } };
assert.throws(() => acceptAgreement(new Map(), highRate, P(request), agreement, '1'), /profile_mismatch/);
// R8: the complete signed-receipt path uses no optimistic objects or dependencies.
assert.deepEqual(transcript.objects.slice(-5).map(o => o.envelope.kind), ['receipt', 'receipt_acceptance', 'finalization', 'settlement_instruction', 'settlement_receipt']);
assert(!transcript.objects.some(o => ['challenge', 'opening', 'opening_acceptance', 'verdict'].includes(o.envelope.kind)));
assert.equal(P(commitment).commitment, null);
assert.deepEqual(P(request).assurance_parameters, {});
assert.equal(P(receipt).assurance_evidence, null);

// Claude follow-ups: independent delivery/validation deadlines and bounded short-output sampling.
const windowReceipt = { envelope: { issued_at: timestamp(119) } };
const windowAgreement = { envelope: { payload: { receipt_deadline: timestamp(120), acceptance_deadline: timestamp(130) } } };
const windowAcceptance = { envelope: { issued_at: timestamp(129), payload: { receipt_observed_at: timestamp(119) } } };
checkReceiptAcceptance(windowReceipt, windowAgreement, windowAcceptance);
assert.throws(() => checkReceiptAcceptance(windowReceipt, windowAgreement, { envelope: { ...windowAcceptance.envelope, issued_at: timestamp(131) } }), /deadline_exceeded/);
assert.throws(() => checkReceiptAcceptance(windowReceipt, windowAgreement, { envelope: { ...windowAcceptance.envelope, payload: { receipt_observed_at: timestamp(121) } } }), /deadline_exceeded/);
const seed = Buffer.alloc(32, 7);
assert.deepEqual(challengeIndices('1', '2', seed), ['0']);
assert.equal(challengeIndices('4', '2', seed).length, 2);
for (const [leaves, count] of [['0', '2'], ['4294967297', '2'], ['1', '0'], ['2', '1025']]) {
  assert.throws(() => challengeIndices(leaves, count, seed), /profile_mismatch/);
}
if (process.argv.includes('--example')) console.log(JSON.stringify(transcript, null, 2));
else console.log(`Passed eight review regression groups, two follow-up groups, and ${transcript.objects.length} signed mock-transcript objects. Not a full conformance suite.`);
