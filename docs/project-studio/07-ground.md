# Stage 7: ground an AI and measure the answers

**Outcome:** an evaluation scorecard. **Time:** 1 to 2 hours.

## Explain and inspect

Grounding gives an AI selected evidence and asks it to stay inside it.
Retrieval chooses context; generation writes an answer. Good retrieval cannot
repair a false source or guarantee faithful output. Start with a clear prompt
and relevant bundle link. Model Context Protocol (MCP) earns its extra
infrastructure only when bounded search, identity and logging improve measured
results. Read the [grounding evidence](../../research/okf-evolution-review/grounding-and-retrieval.md).

## Do and check

Freeze the candidate and questions. Write the expected identity, required
claims, sources and serious errors. Run the same held-back questions with no
context, direct prompt-and-link context and bounded MCP retrieval if available.
Require citations and allow “not supported”. Do not send confidential sources
to an unapproved service.

Use the [scorecard](evaluation-scorecard.md). Count identity selection,
supported, contradicted and unsupported claims. Record context size, latency,
cost and failures. Report dangerous cases, not only averages.

## Retrieve and reflect

Explain why retrieval accuracy and answer correctness are separate. Decide
whether MCP earns its operational cost.

Next: [create a personal interface](08-create.md).
