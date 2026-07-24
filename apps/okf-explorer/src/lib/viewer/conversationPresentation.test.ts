import { describe, expect, it } from 'vitest';
import type { OkfNode } from '$lib/types';
import { conversationPresentation, isConversationNode } from './conversationPresentation';

const exchange: OkfNode = {
  id: 'ex-0001',
  type: 'Exchange',
  title: 'Inspect repository',
  section: 'exchanges',
  body: `# Inspect repository

## User Prompt

\`\`\`\`text
Is the repository clean?
\`\`\`\`

## Codex Response

### Response 1 (commentary)

- Timestamp: \`2026-07-24T09:00:00Z\`

\`\`\`\`text
I am checking the worktree.
\`\`\`\`

### Response 2 (final_answer)

- Timestamp: \`2026-07-24T09:00:05Z\`

\`\`\`\`text
Yes. The repository is clean.
\`\`\`\`

## Contribution Reading

Public derivative.`
};

describe('conversation presentation', () => {
  it('detects exchange nodes without treating generic Markdown as a conversation', () => {
    expect(isConversationNode(exchange)).toBe(true);
    expect(isConversationNode({ ...exchange, type: 'Document', section: 'root' })).toBe(false);
  });

  it('extracts the prompt, commentary and final answer in recorded order', () => {
    expect(conversationPresentation(exchange)).toEqual({
      prompt: 'Is the repository clean?',
      responses: [
        {
          number: 1,
          kind: 'commentary',
          timestamp: '2026-07-24T09:00:00Z',
          text: 'I am checking the worktree.'
        },
        {
          number: 2,
          kind: 'final_answer',
          timestamp: '2026-07-24T09:00:05Z',
          text: 'Yes. The repository is clean.'
        }
      ],
      final: {
        number: 2,
        kind: 'final_answer',
        timestamp: '2026-07-24T09:00:05Z',
        text: 'Yes. The repository is clean.'
      },
      commentary: [
        {
          number: 1,
          kind: 'commentary',
          timestamp: '2026-07-24T09:00:00Z',
          text: 'I am checking the worktree.'
        }
      ]
    });
  });
});
