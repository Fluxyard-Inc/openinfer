# OpenInfer

A proposal for open machine-service transactions, starting with a practical pilot through fluxyard.

Naming: **fluxyard** is the product, platform, and public brand; **Fluxyard, Inc.** is the company. Use the company name for corporate and research attribution. Preserve repository names, URLs, and code identifiers.

[openinfer.network](https://openinfer.network)

Start with the [practical research plan](docs/RESEARCH.md): one buyer, one known provider, and one recurring workload over four weeks. Measure repeat demand, delivery, full cost, and operator effort before expanding the protocol or resuming verification research.

Read [OpenInfer Protocol Draft 0001](docs/PROTOCOL.md) for the protocol-family index and maturity map:

- [Core transaction protocol](docs/core/OI-CORE-0001.md)
- [Open-model inference profile](docs/profiles/OI-PROFILE-INFERENCE-0001.md)
- [Buyer-accepted signed receipts](docs/profiles/OI-PROFILE-SIGNED-RECEIPT-0001.md)
- [Paused experimental optimistic verification profile](docs/profiles/OI-PROFILE-OPTIMISTIC-0001.md)

Run the specification examples and selected regression checks with `node tests/protocol-cases.mjs`; add `--example` to print the complete signed mock transaction.

Run `node tests/site-checks.mjs` for publication structure, anchor, asset, and draft-link checks. For layout changes, also inspect the page at mobile, tablet, and desktop widths; static checks do not verify overflow or diagram readability.

## Deploy

Cloudflare Pages builds the static `public/` directory through the repository’s Git integration when `main` changes. The production project is `openinfer-network`, serving [openinfer.network](https://openinfer.network). No package installation or application build is required.
