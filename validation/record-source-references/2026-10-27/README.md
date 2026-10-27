# Record source reference candidate evidence — 27 October 2026

[CI run 40492019206](https://github.com/chris-page-gov/okf-explorer/actions/runs/40492019206)
and [successful job 122149016399](https://github.com/chris-page-gov/okf-explorer/actions/runs/40492019206/job/122149016399)
executed the unchanged Heritage evaluation: all 100 questions scored at least
80, with a mean of 92.6, and all three local journeys passed.

The reviewed PR head was `f71f776253d54a51552f061a1b10b0b922b99023`.
The actual checkout was merge candidate
`e3c0eaa1bd48b99320e57627639e5a1139867146`.
The observed app tree is
`827ac61a364500a2c73ad949dfda36f0839e54056644edd414ddb34f96aee960`;
its build-manifest SHA-256 is
`bbb482b252b9385149ab06a0bb5cbaae778e65a9498ea5c06d3683f4aa297d7a`.

- [Previous evidence](pre-update/retention.json) preserves the preceding receipt
  and both compressed result files byte for byte, with [checksums](pre-update/SHA256SUMS).
- [Observed candidate origin](observed-candidate/origin.json) identifies artefact
  `12728954654` and inventories the six unchanged import inputs, with
  [checksums](observed-candidate/SHA256SUMS). The downloaded ZIP was 28,898 bytes,
  SHA-256 `b6c960c5bb1d158488e44016a7004f636e9adc112f3220eeb7014f3619cfe27a`.

The materialised receipt derives from these observed inputs. A later evidence-only
commit records their executed candidate identity; these observations do not
establish a deployed commit. Public deployment verification remains separate.
