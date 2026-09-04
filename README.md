# OpenInfer

The manifesto for an open protocol for the machine economy.

[openinfer.network](https://openinfer.network)

Read [OpenInfer Protocol Draft 0001](docs/PROTOCOL.md) for the protocol-family index and maturity map:

- [Core transaction protocol](docs/core/OI-CORE-0001.md)
- [Open-model inference profile](docs/profiles/OI-PROFILE-INFERENCE-0001.md)
- [Buyer-accepted signed receipts](docs/profiles/OI-PROFILE-SIGNED-RECEIPT-0001.md)
- [Experimental optimistic verification profile](docs/profiles/OI-PROFILE-OPTIMISTIC-0001.md)
- [Research plan E0–E7](docs/RESEARCH.md)

Run the specification examples and selected regression checks with `node tests/protocol-cases.mjs`; add `--example` to print the complete signed mock transaction.

## Deploy

```sh
wrangler pages deploy public --project-name=openinfer --branch=main
```
