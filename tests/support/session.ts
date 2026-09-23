import { mock } from 'bun:test';
import type { Plugin } from '@opencode/plugin';

type Prompt = Plugin.Context['session']['prompt'];

// Command registration only submits input; it must not inspect the host's reply
// or access any other session capability (including hooks and child execution).
export function promptRecorder() {
  const response = new Proxy({}, {
    get(_target, key) {
      if (key === 'then') return undefined;
      throw new Error(`Unexpected prompt response access: ${String(key)}`);
    },
  }) as Awaited<ReturnType<Prompt>>;
  const prompt = mock<Prompt>(async () => response);
  const session = new Proxy({ prompt }, {
    get(target, key) {
      if (key === 'prompt') return target.prompt;
      throw new Error(`Unexpected session capability: ${String(key)}`);
    },
  });
  return { session, prompt };
}
