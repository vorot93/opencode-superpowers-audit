import { afterAll, beforeAll, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expected, fixture, skillIDs } from './support/fixtures.js';
import { pluginContext, registry } from './support/registry.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
let workspace: string;
let packed: URL;

async function run(command: string[], cwd: string) {
  const child = Bun.spawn(command, {
    cwd, stdout: 'pipe', stderr: 'pipe', timeout: 30_000, killSignal: 'SIGKILL',
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(' ')} (exit ${exitCode})\n${stdout}\n${stderr}`);
  }
}

beforeAll(async () => {
  const parent = join(homedir(), '.superpowers/opencode-superpowers-audit/verification');
  await mkdir(parent, { recursive: true });
  workspace = await mkdtemp(join(parent, 'package-test-'));
  const checkout = join(workspace, 'checkout');
  await mkdir(checkout);
  // A source-only checkout must package successfully without an existing dist tree.
  for (const file of ['package.json', 'index.js', 'src', 'skills', 'README.md', 'DESIGN.md', 'LICENSE', 'NOTICE']) {
    await cp(new URL(file, root), join(checkout, file), { recursive: true });
  }
  await run([process.execPath, 'pm', 'pack', '--ignore-scripts', '--destination', workspace], checkout);
  const archive = (await readdir(workspace)).find(file => file.endsWith('.tgz'))!;
  await run(['tar', '-xzf', join(workspace, archive), '-C', workspace], workspace);
  const directory = join(workspace, 'package');
  await run([process.execPath, 'install', '--production', '--ignore-scripts'], directory);
  packed = pathToFileURL(`${directory}/`);
}, 120_000);

afterAll(async () => {
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

test('the manifest has no hooks that trigger npm Git preparation', () => {
  // Pacote spawns npm for these hooks even if the hook itself only runs Bun.
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack']) {
    expect(manifest.scripts[hook]).toBeUndefined();
  }
});

test('a source-only tarball loads with production dependencies and registers the audit', async () => {
  const { default: plugin } = await import(new URL('index.js', packed).href);
  expect(plugin.id).toBe('opencode-superpowers-audit');
  const host = registry();
  await plugin.setup(pluginContext(host, { prompt: async () => { throw new Error('Unexpected prompt'); } }).ctx);
  expect(host.commands.has('audit')).toBe(true);
  expect(host.skills.get('superpowers-audit')?.content).toContain('brainstorming: integrated');
  for (const id of skillIDs) expect(host.skills.get(id)?.content).toBe(expected(id));
  expect(await readFile(new URL('skills/superpowers-audit/SKILL.md', packed), 'utf8'))
    .toBe(await readFile(new URL('skills/superpowers-audit/SKILL.md', root), 'utf8'));
  expect(manifest.main).toBe('./index.js');
  expect(manifest.exports).toBe('./index.js');
});

test('packaged adapters produce the complete independently reviewed golden bodies', async () => {
  const { adaptSkill } = await import(new URL('src/superpowers.ts', packed).href);
  for (const id of skillIDs) {
    expect(adaptSkill(id, fixture(id))).toEqual({ status: 'integrated', content: expected(id) });
  }
});

test('the package excludes tests, generated output, and runtime host imports', async () => {
  const files = await readdir(packed);
  for (const excluded of ['tests', 'dist', '.superpowers']) expect(files).not.toContain(excluded);
  const source = new URL('src/', packed);
  const transpiler = new Bun.Transpiler({ loader: 'ts' });
  for (const file of await readdir(source)) {
    const javascript = transpiler.transformSync(await readFile(new URL(file, source), 'utf8'));
    expect(javascript).not.toContain('@opencode/plugin');
    expect(javascript).not.toMatch(/tests[\\/](?:fixtures|expected)|\.superpowers[\\/]/);
  }
});
