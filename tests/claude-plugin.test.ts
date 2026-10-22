import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const root = new URL('../', import.meta.url);
const json = async (path: string) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const pkg = await json('package.json');

async function skill(path: string) {
  const text = (await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n');
  const [, frontmatter, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text)!;
  return { frontmatter: parse(frontmatter) as Record<string, unknown>, body };
}

test('manifest matches the package', async () => {
  const plugin = await json('.claude-plugin/plugin.json');
  expect(plugin.name).toBe('superpowers-audit');
  expect(plugin.version).toBe(pkg.version);
  expect(plugin.license).toBe('Apache-2.0');
  expect(Object.keys(plugin.userConfig)).toEqual(['reviewers', 'maxRounds', 'artifactDirectory']);
  for (const option of Object.values<any>(plugin.userConfig)) {
    expect(typeof option.title).toBe('string');
    expect(typeof option.description).toBe('string');
  }
  expect(plugin.userConfig.reviewers).toMatchObject({ type: 'string', multiple: true });
  expect(plugin.userConfig.maxRounds).toMatchObject({ type: 'number', min: 1, default: 5 });
  expect(plugin.userConfig.artifactDirectory.type).toBe('string');
});

test('marketplace lists the repository root', async () => {
  const marketplace = await json('.claude-plugin/marketplace.json');
  expect(marketplace.name).toBe('superpowers-audit');
  expect(marketplace.owner.name).toBe('Artem Vorotnikov');
  expect(marketplace.plugins).toHaveLength(1);
  expect(marketplace.plugins[0]).toMatchObject({ name: 'superpowers-audit', source: './', version: pkg.version });
});

test('/audit names the qualified shared skill', async () => {
  const { frontmatter, body } = await skill('skills/audit/SKILL.md');
  expect(frontmatter.name).toBe('audit');
  expect(frontmatter['disable-model-invocation']).toBe(true);
  expect(frontmatter['argument-hint']).toBe('<path>');
  for (const text of ['superpowers-audit:superpowers-audit', 'Skill tool', '$ARGUMENTS']) {
    expect(body).toContain(text);
  }
});

test('no skill pre-authorizes tools', async () => {
  for (const path of ['skills/audit/SKILL.md', 'skills/superpowers-audit/SKILL.md']) {
    expect((await skill(path)).frontmatter).not.toHaveProperty('allowed-tools');
  }
});

test('the npm package excludes Claude Code files', () => {
  const claudeOnly = ['.claude-plugin', 'hooks', 'integration', 'skills/audit', 'skills/superpowers-audit/references/claude-code.md'];
  for (const entry of pkg.files as string[]) {
    expect(claudeOnly.some(path => entry === path || entry.startsWith(`${path}/`) || path.startsWith(`${entry}/`))).toBe(false);
  }
  expect(pkg.files).toContain('skills/superpowers-audit/SKILL.md');
  expect(pkg.files).toContain('skills/superpowers-audit/references/opencode.md');
});
