import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('public/index.html', root), 'utf8');
const css = readFileSync(new URL('public/site.css', root), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique, including SVG markers');
assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
assert.equal((html.match(/<h2\b/g) ?? []).length, 4, 'Keep four main publication sections');

for (const [, href] of html.matchAll(/\bhref="([^"]+)"/g)) {
  if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `Missing anchor: ${href}`);
  else if (href.startsWith('https://github.com/Fluxyard-Inc/openinfer/blob/main/')) {
    const path = href.split('/blob/main/')[1].split('#')[0];
    assert(existsSync(new URL(path, root)), `Missing linked draft: ${path}`);
  } else if (!/^[a-z]+:/i.test(href)) {
    assert(existsSync(new URL(`public/${href.split('?')[0]}`, root)), `Missing asset: ${href}`);
  }
}
for (const [, id] of html.matchAll(/\baria-labelledby="([^"]+)"/g)) {
  for (const ref of id.split(/\s+/)) assert(ids.includes(ref), `Missing accessible label: ${ref}`);
}
for (const [, marker] of html.matchAll(/url\(#([^\)]+)\)/g)) assert(ids.includes(marker));
for (const [, path] of css.matchAll(/url\("([^"]+)"\)/g)) {
  assert(existsSync(new URL(`public/${path}`, root)), `Missing font: ${path}`);
}
assert(html.indexOf('id="research-title"') < html.indexOf('id="protocol"'));
assert.match(html, /buyer-accepted signed receipts and simulated settlement/);
assert.match(html, /Optimistic execution verification remains experimental/);
for (const section of ['protocol', 'roadmap']) {
  const content = html.match(new RegExp(`<section[^>]+id="${section}"[\\s\\S]*?</section>`))?.[0];
  assert.match(content, /<a href="https:\/\/fluxyard\.ai\/">Fluxyard<\/a>/, `${section} should link to Fluxyard`);
}
assert.match(html, /<footer>[\s\S]*Research by <a href="https:\/\/fluxyard\.ai\/">Fluxyard/);
assert.doesNotMatch(html, /Most transactions settle cheaply|optimistic-v2|Level [0-5]/);
for (const variant of ['desktop', 'mobile']) {
  const audit = html.match(new RegExp(`<svg class="diagram-${variant}" viewBox="0 0 (?:760 570|360 810)"[\\s\\S]*?</svg>`))?.[0];
  assert(audit, `Missing ${variant} audit diagram`);
  for (const outcome of ['VALID', 'INVALID', 'UNCLEAR']) assert(audit.includes(outcome));
}
console.log(`Publication structure, anchors, assets, draft links, and audit outcomes passed (${fileURLToPath(root)}).`);
console.log('Responsive geometry and keyboard navigation require a browser check; these are not screenshot tests.');
