import type { OkfNode } from '$lib/types';

export type ConversationResponse = {
  number: number;
  kind: string;
  timestamp: string;
  text: string;
};

export type ConversationPresentation = {
  prompt: string;
  responses: ConversationResponse[];
  final: ConversationResponse | null;
  commentary: ConversationResponse[];
};

function sectionText(body: string, heading: string): string {
  const marker = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'mi');
  const match = marker.exec(body);
  if (!match) return '';
  const rest = body.slice(match.index + match[0].length).replace(/^\s*/, '');
  const next = rest.search(/\n##\s+/);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function firstFence(text: string): string {
  const match = /````[a-zA-Z0-9_-]*\n([\s\S]*?)\n````/.exec(text)
    || /```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/.exec(text);
  return (match?.[1] || text).trim();
}

export function isConversationNode(node: OkfNode | null | undefined): boolean {
  if (!node) return false;
  const type = String(node.type || '').toLowerCase();
  const section = String(node.section || '').toLowerCase();
  const body = String(node.body || '');
  return (type === 'exchange' || section === 'exchanges')
    && /^##\s+User Prompt\s*$/mi.test(body)
    && /^##\s+Codex Response\s*$/mi.test(body);
}

export function conversationPresentation(node: OkfNode | null | undefined): ConversationPresentation | null {
  if (!isConversationNode(node)) return null;
  const body = String(node?.body || '');
  const prompt = firstFence(sectionText(body, 'User Prompt'));
  const responseSection = sectionText(body, 'Codex Response');
  const responses: ConversationResponse[] = [];
  const responsePattern = /^###\s+Response\s+(\d+)\s+\(([^)]+)\)\s*\n([\s\S]*?)(?=^###\s+Response\s+\d+\s+\(|(?![\s\S]))/gmi;
  let match: RegExpExecArray | null;

  while ((match = responsePattern.exec(responseSection))) {
    const block = match[3];
    const timestampMatch = /-\s+Timestamp:\s+`([^`]+)`/.exec(block);
    responses.push({
      number: Number(match[1]),
      kind: match[2].trim(),
      timestamp: timestampMatch?.[1] || '',
      text: firstFence(block.replace(/-\s+Timestamp:\s+`[^`]+`/, '')).trim()
    });
  }

  const finalResponses = responses.filter((response) => response.kind === 'final_answer');
  return {
    prompt,
    responses,
    final: finalResponses.at(-1) || responses.at(-1) || null,
    commentary: responses.filter((response) => response.kind !== 'final_answer')
  };
}
