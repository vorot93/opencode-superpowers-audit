// Host-neutral configuration cases. `options` is the OpenCode object form;
// `env` is the Claude Code CLAUDE_PLUGIN_OPTION_* form (unset options are not
// exported). Either is absent when the other host cannot represent the case.
export interface ConfigVector {
  name: string;
  options?: unknown;
  env?: Record<string, string>;
  valid: boolean;
  errorKey?: 'reviewers' | 'maxRounds' | 'artifactDirectory';
}

const reviewers = (value: string) => ({ CLAUDE_PLUGIN_OPTION_REVIEWERS: value });
const maxRounds = (value: string) => ({ CLAUDE_PLUGIN_OPTION_MAXROUNDS: value });
const artifactDirectory = (value: string) => ({ CLAUDE_PLUGIN_OPTION_ARTIFACTDIRECTORY: value });

export const configVectors: readonly ConfigVector[] = [
  { name: 'defaults', options: {}, env: {}, valid: true },
  {
    name: 'mapping with variant',
    options: { reviewers: { 'anthropic/claude-opus-5-5': 'xai/grok-4.7#xhigh' } },
    env: reviewers('anthropic/claude-opus-5-5=xai/grok-4.7#xhigh'),
    valid: true,
  },
  {
    name: 'two entries',
    options: { reviewers: { 'a/w': 'b/r', 'c/w': 'd/r#high' } },
    env: reviewers('a/w=b/r,c/w=d/r#high'),
    valid: true,
  },
  {
    name: 'model path with slash',
    options: { reviewers: { 'gateway/team/writer': 'other/team/reviewer#high' } },
    env: reviewers('gateway/team/writer=other/team/reviewer#high'),
    valid: true,
  },
  {
    name: 'custom rounds and directory',
    options: { maxRounds: 3, artifactDirectory: ' ../notes ' },
    env: { ...maxRounds('3'), ...artifactDirectory(' ../notes ') },
    valid: true,
  },
  { name: 'zero rounds', options: { maxRounds: 0 }, env: maxRounds('0'), valid: false, errorKey: 'maxRounds' },
  { name: 'fractional rounds', options: { maxRounds: 1.5 }, env: maxRounds('1.5'), valid: false, errorKey: 'maxRounds' },
  { name: 'non-numeric rounds', options: { maxRounds: '5x' }, env: maxRounds('5x'), valid: false, errorKey: 'maxRounds' },
  {
    name: 'blank directory',
    options: { artifactDirectory: ' \t ' },
    env: artifactDirectory(' \t '),
    valid: false,
    errorKey: 'artifactDirectory',
  },
  {
    name: 'writer variant',
    options: { reviewers: { 'a/w#high': 'b/r' } },
    env: reviewers('a/w#high=b/r'),
    valid: false,
    errorKey: 'reviewers',
  },
  {
    name: 'missing provider',
    options: { reviewers: { 'a/w': 'missing-provider' } },
    env: reviewers('a/w=missing-provider'),
    valid: false,
    errorKey: 'reviewers',
  },
  {
    name: 'empty variant',
    options: { reviewers: { 'a/w': 'b/r#' } },
    env: reviewers('a/w=b/r#'),
    valid: false,
    errorKey: 'reviewers',
  },
  {
    name: 'double variant',
    options: { reviewers: { 'a/w': 'b/r#high#extra' } },
    env: reviewers('a/w=b/r#high#extra'),
    valid: false,
    errorKey: 'reviewers',
  },
  {
    name: 'whitespace',
    options: { reviewers: { 'a/w': 'b/re viewer' } },
    env: reviewers('a/w=b/re viewer'),
    valid: false,
    errorKey: 'reviewers',
  },
  // A comma cannot be represented in the comma-joined env form, so both hosts reject it.
  { name: 'comma in entry', options: { reviewers: { 'a/w': 'b/r,x' } }, valid: false, errorKey: 'reviewers' },
  { name: 'trailing comma', env: reviewers('a/w=b/r,'), valid: false, errorKey: 'reviewers' },
  { name: 'empty entry', env: reviewers('a/w=b/r,,c/w=d/r'), valid: false, errorKey: 'reviewers' },
  { name: 'missing separator', env: reviewers('a/w'), valid: false, errorKey: 'reviewers' },
  { name: 'duplicate writer', env: reviewers('a/w=b/r,a/w=c/r'), valid: false, errorKey: 'reviewers' },
];
