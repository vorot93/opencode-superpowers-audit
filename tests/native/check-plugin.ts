import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import type { Plugin } from '@opencode/plugin';

// External, independently authored expectations keep this checker usable against
// installed tarballs without importing product code or shipping upstream fixtures.
interface Expectations {
  bodies: Record<string, string | null>;
  statuses: string[];
}

export default {
  id: 'audit-native-check',
  async setup(ctx) {
    const output = process.env.AUDIT_CHECK_OUTPUT;
    if (!output) throw new Error('AUDIT_CHECK_OUTPUT is required');
    try {
      const input = process.env.AUDIT_CHECK_EXPECTATIONS;
      assert(input, 'AUDIT_CHECK_EXPECTATIONS is required');
      const expected: Expectations = JSON.parse(await readFile(input, 'utf8'));
      const skills = await ctx.skill.list();
      const commands = await ctx.command.list();
      const shared = skills.data.filter(skill => skill.id === 'superpowers-audit');
      assert.equal(shared.length, 1, 'exactly one shared audit skill');
      assert(shared[0]!.content.includes('# Superpowers Audit'), 'shared instructions loaded');
      assert.equal(commands.data.filter(command => command.name === 'audit').length, 1);
      for (const [id, body] of Object.entries(expected.bodies)) {
        const skill = skills.data.find(skill => skill.id === id);
        if (body === null) assert.equal(skill, undefined, `${id} must remain absent`);
        else assert.equal(skill?.content, body, `${id}: full native body`);
      }
      for (const status of expected.statuses) assert(shared[0]!.content.includes(status), status);
      for (let n = 0; n < 3; n++) {
        await ctx.skill.reload();
        await ctx.command.reload();
        assert.deepEqual(await ctx.skill.list(), skills, `skill replay ${n + 1}`);
        assert.deepEqual(await ctx.command.list(), commands, `command replay ${n + 1}`);
      }
      await writeFile(output, JSON.stringify({ ok: true, version: ctx.app.version, reloads: 3, skills, commands }, null, 2));
    } catch (error) {
      await writeFile(output, JSON.stringify({ ok: false, error: String(error) }, null, 2));
      throw error;
    }
  },
} satisfies Plugin.Plugin;
