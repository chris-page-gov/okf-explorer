# Stage 7: ground an AI and measure the answers

**Outcome:** an evaluation scorecard. **Time:** 1 to 2 hours.

## Explain and inspect

Grounding gives an AI selected evidence and asks it to stay inside it.
Retrieval chooses context; generation writes an answer. Good retrieval cannot
repair a false source or guarantee faithful output. Start with a clear prompt
and relevant bundle link. Model Context Protocol (MCP) earns its extra
infrastructure only when bounded search, identity and logging improve measured
results. Read the [grounding evidence](../../research/okf-evolution-review/grounding-and-retrieval.md).

## Start with a worked question

Use [the fictional context prompt and expected answers](../onboarding/first-bundle.md#ask-one-question)
or [the government evidence exercise](../onboarding/try-a-bundle.md).
Choose a [supported access route](../ai-okf-usage.md) and first identify exactly
what your AI received. Explorer's local MCP adapter remains a retrieval prototype,
so include an MCP comparison only when you have a verified compatible server.

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

You can finish with the evaluated bundle. Optional next step:
[create a personal interface](08-create.md).
