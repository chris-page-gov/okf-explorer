# Publication units

OKF Explorer owns the reusable browser, schemas, Foundry process, validation
contracts and the registry that points at exemplars. Large exemplars have their
own publication unit so one corpus does not consume the Explorer documentation
site's finite deployment budget.

The first external unit is the [Coventry and Warwickshire heritage exemplar](heritage-coventry-warwickshire/README.md).
Its machine-readable [publication descriptor](heritage-coventry-warwickshire/publication-unit.json)
drives a deterministic export. The descriptor assigns its corpus and fixture
URL closure to the separate project base. Whether a particular release is
deployed or promoted belongs only in signed release evidence.

Build or verify the export with:

```sh
uv run --locked python scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --output tmp/heritage-publication
uv run --locked python scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --check
```
