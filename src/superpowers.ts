import { createHash } from 'node:crypto';
import type { SupportedSkill } from './skill.js';

export interface SkillAdaptation {
  status: 'integrated' | 'incompatible';
  content: string;
  reason?: string;
}

// Superpowers 7.0.0 bodies live only in attributed tests. Normalize only CRLF.
export const supportedHashes: Record<SupportedSkill, { baseline: string; transformed: string }> = {
  brainstorming: {
    baseline: '7066acbd55d8507328effff41bcf611eafca117c5bd7b9ac7fa545096132533a',
    transformed: '2711571587d306948e5493f51ec749a7edfc2afd459a1856a417543662d018ff',
  },
  'writing-plans': {
    baseline: '1fa01b954171b1d2b8bc0208dfbc6a01edf8a2ca715d18f76f043952e37e744f',
    transformed: '939170c197e7f7ad6603dd837caa2513b2e2c0b83dfe447fef56d89d6c47eb38',
  },
};

const edits: Record<SupportedSkill, readonly (readonly [string, string])[]> = {
  brainstorming: [
    [
      'until the check is back. Sort what the builder asks into three piles:',
      'until the builder check, self-review, and audit are complete. Sort what the builder asks into three piles:',
    ],
    [
      'document with their answers, then hand it over with a short list of the\n'
        + "calls you made so they can check those while reading. That's the only\n"
        + 'round of questions the check produces. Without a subagent tool, read the\n'
        + 'document as that builder yourself.',
      'document with their answers, then complete self-review and adversarial review\n'
        + 'before human handoff. That is the only round of questions the builder check produces.\n'
        + 'Without a subagent tool, read the document as that builder yourself.',
    ],
    [
      '<HARD-GATE>',
      '## Spec Self-Review\n\n'
        + 'For a written project design, after resolving the builder check, review the\n'
        + 'current document yourself for placeholders, contradictions, scope, and ambiguity.\n'
        + "Fix issues inline; preserve the human's decisions and label your own calls.\n"
        + 'Then complete Adversarial Review before handing over the document.\n\n'
        + '## Adversarial Review\n\n'
        + 'Load the native `superpowers-audit` skill after spec self-review. Supply the\n'
        + 'written design, agreed brief/decisions, and known drafting models; remain in this\n'
        + 'writer session. Complete its discussion and report before human handoff.\n'
        + 'Present a non-approved result and ask for direction; preserve the actual result\n'
        + 'if the human proceeds. Audit questions about material decisions still go to the human;\n'
        + "the builder check's one question round does not waive that requirement.\n\n"
        + '## Human Document Review\n\n'
        + 'Hand over the current design and audit report, state the actual outcome, and\n'
        + 'include a short list of calls you made so the human can check those while reading:\n\n'
        + '> "Spec: `<spec path>`. Audit: <actual outcome>; report: `<report path>`. My calls: <short list>. Please review the full document and report. Do you approve this design for planning?"\n\n'
        + "Wait for the human's decision. After direct human edits or changes they request,\n"
        + 'rerun self-review and a fresh audit before renewed handoff. Only proceed to\n'
        + 'planning once the human approves the current written design.\n\n'
        + '<HARD-GATE>',
    ],
    [
      "After a project's document is approved, the next step is the plan. For\n"
        + 'software, invoke superpowers:writing-plans and no other skill.',
      "After a project's builder check, self-review, audit, and human document approval,\n"
        + 'the next step is the plan. For software, invoke superpowers:writing-plans and no other skill.',
    ],
  ],
  'writing-plans': [
    [
      'No need to re-review — just fix and move on.',
      'Then complete the Adversarial Review stage below.',
    ],
    [
      '## Execution Handoff',
      '## Adversarial Review\n\n'
        + 'After completing self-review, load the native `superpowers-audit` skill. Supply\n'
        + 'the plan, approved governing spec/amendments, relevant decisions, and known authors.\n'
        + 'Run its conversation in this writer session and write its report before handoff.\n'
        + 'Present the actual outcome and ask for direction when it is not Approved.\n\n'
        + '## Execution Handoff',
    ],
    [
      'After saving and self-reviewing the plan, link it for your human partner\nto read.',
      'After saving, self-reviewing, and auditing the plan, link the current plan\n'
        + 'and audit report and state the actual outcome for your human partner.',
    ],
    [
      '**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Please review the plan. Which execution approach would you prefer?**',
      '**"Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both. Which execution approach would you prefer?**',
    ],
    [
      '**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Please review the plan. Does it capture what you want?"**',
      '**"Plan: `<plan path>`. Audit: <actual outcome>; report: `<report path>`. Please review both. Does the plan capture what you want?"**',
    ],
    [
      '## Execution Handoff',
      '## Execution Handoff\n\n'
        + 'After direct human edits or changes requested during review, rerun self-review and\n'
        + 'start a fresh audit before renewed handoff. Preserve an already selected execution\n'
        + 'method and wait for approval of the revised plan.',
    ],
  ],
};

function replaceOnce(text: string, from: string, to: string): string {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) {
    throw new Error('Invalid supported Superpowers edit anchor');
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

export function adaptSkill(id: SupportedSkill, content: string): SkillAdaptation {
  const normalized = content.replaceAll('\r\n', '\n');
  const digest = hash(normalized);
  const known = supportedHashes[id];
  if (digest === known.transformed) return { status: 'integrated', content: normalized };
  if (digest !== known.baseline) {
    return {
      status: 'incompatible',
      content: withIntegrationNotice(id, content, 'Unsupported Superpowers definition.'),
      reason: 'Unsupported Superpowers definition.',
    };
  }
  const transformed = edits[id].reduce((text, [from, to]) => replaceOnce(text, from, to), normalized);
  if (hash(transformed) !== known.transformed) throw new Error(`Unexpected transformed body: ${id}`);
  return { status: 'integrated', content: transformed };
}

export function withIntegrationNotice(id: SupportedSkill, content: string, reason: string): string {
  const marker = `<!-- opencode-superpowers-audit:unavailable:${id} -->`;
  const notice = (message: string) => `${marker}\n## Audit integration unavailable\n`
    + `Tell the human that automatic audit integration for ${id} is unavailable\n`
    + `for this definition. Reason: ${message}\n`
    + 'Its original workflow follows unchanged. Manual `/audit` remains available after\n'
    + 'self-review when the command and shared audit skill are loaded and permitted.\n'
    + 'Automatic integration requires a supported Superpowers definition.\n\n';
  const reasons = [reason, 'Unsupported Superpowers definition.',
    'Automatic adaptation failed; see native plugin diagnostics.'];
  if (reasons.some(message => content.replaceAll('\r\n', '\n').startsWith(notice(message)))) return content;
  return notice(reason) + content;
}
