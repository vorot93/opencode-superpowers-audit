import { createHash } from 'node:crypto';
import type { SupportedSkill } from './skill.js';

export interface SkillAdaptation {
  status: 'integrated' | 'incompatible';
  content: string;
  reason?: string;
}

// Full bodies live only in attributed tests. Only CRLF is normalized for matching.
export const supportedHashes: Record<SupportedSkill, { baseline: string; transformed: string }> = {
  brainstorming: {
    baseline: '573348866df4a1741c7a92e7e54fcbbaf61eac7fd306c6645297682736886714',
    transformed: 'e619af3d7a806ec3542b1eccc70821bb43ccb491a6e961cd6059c48ab04797cb',
  },
  'writing-plans': {
    baseline: 'db6d58557ba4d445b49755705bfa2f81650fa6ea34531f5da283d688d62e8bd8',
    transformed: 'de25b9d6438e2528bde8c33c57de62fecb81f5bc3f3acb54f5b23156d7331a58',
  },
};

const edits: Record<SupportedSkill, readonly (readonly [string, string])[]> = {
  brainstorming: [
    [
      '8. **User reviews written spec** — ask user to review the spec file before proceeding',
      '8. **Adversarial review** — load the native `superpowers-audit` skill and complete it in this writer session.\n'
        + '9. **User reviews written spec** — ask user to review the spec file and audit report before proceeding',
    ],
    [
      '9. **Transition to implementation** — invoke writing-plans skill to create implementation plan',
      '10. **Transition to implementation** — invoke writing-plans skill to create implementation plan',
    ],
    [
      '    "Spec self-review\\n(fix inline)" [shape=box];',
      '    "Spec self-review\\n(fix inline)" [shape=box];\n    "Adversarial review" [shape=box];',
    ],
    [
      '    "Spec self-review\\n(fix inline)" -> "User reviews spec?";',
      '    "Spec self-review\\n(fix inline)" -> "Adversarial review";\n'
        + '    "Adversarial review" -> "User reviews spec?";',
    ],
    [
      'Architectural: the ONLY skill you\ninvoke after brainstorming is writing-plans',
      'Architectural: run superpowers-audit after spec self-review, then invoke\n'
        + 'writing-plans after the human approves the written spec',
    ],
    [
      'Fix any issues inline. No need to re-review — just fix and move on.',
      'Fix self-review issues inline, then complete the Adversarial Review stage below.',
    ],
    [
      '**User Review Gate:**',
      '**Adversarial Review:**\n'
        + 'Load the native `superpowers-audit` skill after self-review. Supply the written spec,\n'
        + 'agreed brief/decisions, and known drafting models; remain in this writer session.\n'
        + 'Complete its discussion and report before human handoff. Present a non-approved\n'
        + 'result and ask for direction; preserve the actual result if the human proceeds.\n\n'
        + '**User Review Gate:**',
    ],
    [
      'After the spec review loop passes, ask the user to review the written spec before proceeding:',
      "After self-review and adversarial review, present the current spec, audit outcome, and report for the human's decision before proceeding:",
    ],
    [
      '> "Spec written and committed to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."',
      '> "Spec: <path>. Audit: <actual outcome>; report: <report path>. Please review these before we start writing the implementation plan."',
    ],
    [
      '- Do NOT invoke any other skill. writing-plans is the next step.',
      '- After the audit and human spec approval, writing-plans is the next step; do not start implementation.',
    ],
    [
      "Wait for the user's response. If they request changes, make them and re-run the spec review loop. Only proceed once the user approves.",
      "Wait for the user's response. After direct human edits or changes they request, re-run self-review and a fresh audit before renewed handoff. Only proceed once the user approves.",
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
