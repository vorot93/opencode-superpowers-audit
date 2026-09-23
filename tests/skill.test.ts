import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { parseOptions } from '../src/options.js';
import { renderAuditSkill } from '../src/skill.js';

test('configuration stays data and the shared body remains intact', () => {
  const body = '# Audit workflow\nNative instructions here.\n';
  const options = parseOptions({ artifactDirectory: 'notes/```\n# not instructions' });
  const text = renderAuditSkill(body, options, [
    { id: 'brainstorming', status: 'unavailable' },
    { id: 'writing-plans', status: 'integrated' },
  ]);
  expect(text.startsWith(body)).toBe(true);
  expect(text).toContain('    "artifactDirectory":');
  expect(text).not.toContain('\n# not instructions');
  expect(text).toContain('brainstorming: unavailable');
  expect(text).toContain('writing-plans: integrated');
  expect(text).toContain('notes/```\\n# not instructions');
});

test('adds only missing section separators while preserving every supplied body byte', () => {
  for (const [body, separator] of [
    ['', ''],
    ['# Audit', '\n\n'],
    ['# Audit\n', '\n'],
    ['# Audit\n\n', ''],
    ['# Audit\n\n\n', ''],
    ['# Audit\r\n', '\n'],
    ['# Audit\r\n\r\n', ''],
    ['# Audit  \t', '\n\n'],
  ] as const) {
    const text = renderAuditSkill(body, parseOptions({}), []);
    expect(text.startsWith(body + separator + '## Configuration\n')).toBe(true);
  }
});

test('empty registry status does not introduce an empty paragraph', () => {
  const text = renderAuditSkill('# Audit\n', parseOptions({}), []);
  expect(text).toContain('## Registry content integration\n\nThis is not a per-agent permission verdict.');
});

test('renders actionable registry status and reasons separately from native permissions', () => {
  const text = renderAuditSkill('# Audit\n', parseOptions({}), [
    { id: 'brainstorming', status: 'unavailable', reason: 'Source skill missing' },
    { id: 'writing-plans', status: 'incompatible', reason: 'Unsupported body hash' },
  ]);
  expect(text).toContain('Registry content integration');
  expect(text).toContain('brainstorming: unavailable');
  expect(text).toContain('Source skill missing');
  expect(text).toContain('writing-plans: incompatible');
  expect(text).toContain('Unsupported body hash');
  expect(text).toContain('This is not a per-agent permission verdict.');
  expect(text).toContain('Report known native load denials');
  expect(text).toContain('listed after Superpowers');
  expect(text).toContain('registered and permitted');
});

test('renders invalid options as a correction request without active defaults', () => {
  const body = '# Audit\n';
  const text = renderAuditSkill(body, parseOptions({ maxRounds: 0 }), []);
  expect(text.startsWith(body)).toBe(true);
  expect(text).toContain('Configuration error');
  expect(text).toContain('Request correction from the human before auditor dispatch.');
  expect(text).toContain('maxRounds:');
  expect(text).toContain('    "message":');
  expect(text).not.toContain('"maxRounds": 5');
  expect(text).not.toContain('"reviewers":');
});

test('serializes multiline configuration errors as data', () => {
  const text = renderAuditSkill('# Audit\n', {
    ok: false,
    message: 'options: bad ```\n# not instructions',
  }, []);
  expect(text).toContain('options: bad ```\\n# not instructions');
  expect(text).not.toContain('\n# not instructions');
});

// These assertions check the shipped instruction contract, not model obedience
// or a programmatic classification of the illustrative model references.
for (const [name, reviewers] of [
  ['same provider', { 'gateway/writer-family': 'gateway/other-family' }],
  ['same family through another gateway', { 'vendor/writer-family': 'gateway/writer-family#high' }],
] as const) {
  test(`renders both independence gates despite a user mapping with ${name}`, async () => {
    const body = await readFile(new URL('../skills/superpowers-audit/SKILL.md', import.meta.url), 'utf8');
    const text = renderAuditSkill(body, parseOptions({ reviewers }), []);
    expect(text).toContain('The auditor must use both a different provider and a different model family/class\nfrom every known drafting contributor and the current discussing writer.');
    expect(text).toContain('Routing the same underlying vendor/family through another gateway does not establish\nindependence.');
    expect(text).toContain('If provider or family lineage is uncertain, ask the human to clarify before\ndispatch; do not infer independence from different catalog IDs.');
    expect(text).toContain('If the writer changes models, recheck both provider and model-family independence\nagainst every known contributor and the new current writer before continuing.');
    expect(text).toContain('A user-requested candidate still has to satisfy both independence checks.');
    for (const [author, candidate] of Object.entries(reviewers)) {
      expect(text).toContain(`"${author}": "${candidate}"`);
    }
  });
}

// These full-text snapshots review the rendered artifact, not model obedience.
// Native pressure scenarios are owned by the controller/Task 3.
for (const [name, input] of [
  ['default', {}],
  ['custom', {
    reviewers: { 'gateway/team/writer': 'other/reviewer#high' },
    maxRounds: 3,
    artifactDirectory: '../audit-notes',
  }],
] as const) {
  test(`renders the complete shared skill with ${name} settings`, async () => {
    const body = await readFile(new URL('../skills/superpowers-audit/SKILL.md', import.meta.url), 'utf8');
    expect(renderAuditSkill(body, parseOptions(input), [
      { id: 'brainstorming', status: 'integrated' },
      { id: 'writing-plans', status: 'unavailable', reason: 'Source skill missing' },
    ])).toMatchSnapshot();
  });
}
