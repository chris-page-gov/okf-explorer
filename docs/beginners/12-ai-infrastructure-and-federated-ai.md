# AI Infrastructure And Federated AI

The original small OKF bundle is a research corpus about agent-ready AI
infrastructure and federated learning. These topics demonstrate links,
standards, organisations, research lineage and provenance. They are content
loaded by the Explorer, not all dependencies required to run its interface.

## Model, Agent And Tool

A **model** maps input to output. A language model can generate text or
structured values, but it does not automatically have permission or the
ability to act.

An **agent** combines a model with instructions, tools, state and a control
loop that decides what to do next.

A **tool** is a callable capability: search, a function, an API, code execution
or a workflow.

Tool use introduces questions that plain text generation does not:

- Which tool is relevant?
- Does the argument shape match its contract?
- Is the user authorised for the action?
- What happens if a step is retried?
- How is the outcome observed and audited?

## The Agent-Ready Vertical Stack

The corpus organises these questions into connected layers.

### Contracts And Interfaces

A contract describes how software can use a capability:

- operations;
- arguments and types;
- responses and errors;
- authentication;
- version.

OpenAPI, JSON Schema, GraphQL, gRPC and AsyncAPI cover different interface
styles. A model-friendly description does not remove the need for a precise
machine contract.

### Discovery And Retrieval

Discovery asks what capabilities exist. Retrieval selects a small relevant set
for the current task.

Giving a model every available tool can reduce accuracy and increase prompt
injection exposure. Registries, catalogues, MCP resources and agent cards help
describe candidates.

### Understanding And Grounding

**Schema grounding** checks whether values fit the declared types and fields.

**Semantic grounding** checks whether the selected operation and entities
actually match the user's intent.

A perfectly valid call to the wrong “delete” operation is schema-grounded but
semantically wrong.

### Identity And Authorisation

Identity establishes who or what is acting. Authorisation establishes what it
may do.

Relevant ideas include:

- OAuth delegated access;
- least privilege;
- workload identity;
- token exchange for downstream services;
- sender-constrained tokens;
- user consent and purpose limits.

A bearer token grants access to whoever possesses it. DPoP or mutual TLS can
bind a token to a client proof, reducing theft risk.

### Execution And Orchestration

Real tasks can be multi-step, long-running and failure-prone. A workflow or
orchestration runtime handles:

- state;
- retries;
- timeouts;
- idempotency;
- compensation;
- parallel and sequential steps;
- human approval.

These responsibilities should not live only in a model prompt.

### Policy Enforcement

Policy decides whether an action is permitted under rules and context.
Enforcement points apply that decision.

Policy-as-code systems such as OPA keep policy logic reviewable and separate
from every individual service. The policy decision still needs trustworthy
identity and input attributes.

### Observability And Provenance

Logs record events, metrics record measurements and traces connect work across
components. OpenTelemetry provides common observability structures.

Provenance answers a related but broader evidence question: which entities,
activities and agents produced an outcome?

An operational trace can help construct provenance, but the two are not
identical.

## Protocols In The Corpus

### MCP

Model Context Protocol connects hosts, clients and servers around tools,
resources and prompts. It helps standardise model-to-tool integration.

It does not by itself solve authorisation policy, tool trust or safe use of
retrieved instructions.

### A2A

Agent2Agent describes agent capability discovery, delegation, tasks,
long-running work and streaming between agents.

### Arazzo

Arazzo describes sequences of operations over API descriptions. It provides a
machine-readable workflow narrative rather than an execution engine.

### Structured Outputs

Structured output constrains generated data to a schema. It improves form and
parsing; it does not guarantee that the content is true or authorised.

## Security Concepts

Agent systems face familiar software risks plus instruction-specific risks:

- prompt injection in retrieved content or tool descriptions;
- confused-deputy behaviour;
- excessive permissions;
- secret leakage;
- unsafe retries;
- unverified external actions;
- incomplete audit trails.

Zero-trust architecture means network location alone does not confer trust.
Every request is evaluated using identity, policy and context.

## Federated Learning

Traditional centralised training collects data in one place. **Federated
learning** coordinates training across participants while raw data remains at
those participants.

A simplified round is:

1. the coordinator selects clients;
2. clients receive a model;
3. each client trains on local data;
4. clients return model updates;
5. updates are aggregated;
6. the new shared model begins another round.

Federation reduces some data-centralisation risks. It does not automatically
provide privacy, security, fairness or legal compliance.

## Cross-Device And Cross-Silo

**Cross-device** federation involves very many intermittently available
devices with limited resources.

**Cross-silo** federation involves a smaller number of organisations, often
with stronger infrastructure and legal boundaries.

The threat model, coordination and evaluation approach differ substantially.

## Non-IID Data

Independent and identically distributed, or IID, data assumes participants'
samples come from similar distributions.

Federated data is usually **non-IID**:

- hospitals see different populations;
- devices have different languages and behaviour;
- institutions label outcomes differently.

A single global accuracy number can hide poor performance for a participant or
group.

## Secure Aggregation

Secure aggregation lets the coordinator learn an aggregate of client updates
without seeing an individual update in the clear.

It protects update confidentiality under its threat model. It does not prove
that an update is honest or prevent the final model from leaking information.

## Differential Privacy

Differential privacy gives a mathematical bound on how much one person's data
can affect a released result.

Noise and clipping introduce a privacy–utility trade-off. The guarantee depends
on:

- privacy parameters;
- contribution bounds;
- composition across rounds;
- the protected unit;
- implementation and accounting.

Saying “uses differential privacy” without these details is incomplete.

## Other Privacy Technologies

- **Trusted execution environments** isolate code and data in hardware-backed
  enclaves.
- **Secure multi-party computation** lets parties compute a result without
  revealing inputs to one another.
- **Homomorphic encryption** permits operations over encrypted values.

Each changes performance, trust assumptions and operational complexity.

## Federated Threats

Important risks include:

- membership inference;
- gradient or update leakage;
- model poisoning;
- targeted backdoors;
- malicious coordinators or participants;
- unreliable clients;
- governance failure.

Secure aggregation can make individual malicious updates harder to inspect, so
privacy and robustness controls must be designed together.

## Federated Analytics, Evaluation And Unlearning

**Federated analytics** calculates distributed statistics without necessarily
training a model.

**Federated evaluation** measures performance while evaluation data remains
distributed.

**Federated unlearning** attempts to remove a participant's influence after
training. It is technically and evidentially difficult; deleting raw data does
not automatically remove learned influence.

## Federated RAG

Retrieval-Augmented Generation, or RAG, supplies a model with retrieved
evidence. A federated or confidential design retrieves across sources that
cannot be centralised.

The system must manage:

- query privacy;
- authorisation per source;
- result provenance;
- cross-source ranking;
- bounded context;
- what the generated answer reveals.

This connects directly to the Explorer's source-aware retrieval design.

## Why This Corpus Is A Useful Explorer Example

It contains:

- standards and their stewards;
- research papers and historical lineage;
- frameworks implementing related ideas;
- terms reused across many concepts;
- claims with different authority levels;
- vertical stack dependencies;
- a second federated-learning thread.

That variety exercises graph, backlinks, types, timelines, resources and
provenance better than a flat folder of unrelated notes.

## Continue

Open the [AI infrastructure corpus](../../index.md), then follow its
[stack](../../stack/index.md), [standards](../../standards/index.md),
[federated AI](../../federated/index.md), [frameworks](../../frameworks/index.md)
and [research](../../research/index.md) indexes.

## Next

[Security, privacy, accessibility and responsible use](13-security-privacy-accessibility-and-responsible-use.md)
returns to the safeguards that apply across the Explorer itself.
