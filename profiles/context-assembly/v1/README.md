# Governed context assembly v1

This is an additive contract for evidence packages. It does not change the
frozen Bundle Wiki profile or the OKF 0.2 core.

- [Producer index](index.schema.json): concepts, whole evidence passages,
  directed assertions and explicitly scoped evidence requirements.
- [Assembled package](package.schema.json): resolved concepts, selected records,
  traversal paths, provenance, omissions and evidence sufficiency.
- [Evaluation case](evaluation-case.schema.json): independent assessor
  requirements; these must not be supplied to the assembler as retrieval seeds.
- [Synthetic controls](evaluation-controls.schema.json): declared mutations and
  expected failure handling, kept separate from source-backed inputs.
- [Common definitions](common.schema.json): closed shapes shared by those
  contracts.

The TypeScript contract is maintained in
`apps/okf-explorer/src/lib/context/types.ts`. Validate JSON with
`scripts/check_context_assembly.py`; the schema registry resolves these local
files only. Unknown fields are rejected. Missing provenance and authority remain
representable where the engine needs to report incomplete evidence: passing
shape validation alone is not evidence sufficiency.
Runtime validation also rejects non-string review status, invalid original assertion IRIs and undeclared alias-object fields before assembly.

Package identity is SHA-256 of canonical JSON with `context_id` and
`budget.used_bytes` omitted. The final byte count measures the complete UTF-8
JSON package. Evidence items are retained whole or omitted with a reason.
The package never contains a generated AI answer.

See the [implementation guide](../../../docs/context-assembly.md) and
[evaluation method](../../../docs/context-assembly-evaluation.md).
