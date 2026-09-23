import type { Plugin, Skill } from '@opencode/plugin';
import type { CommandDefinition, CommandEditor } from '@opencode/plugin/promise/command';
import type { SkillEditor } from '@opencode/plugin/promise/skill';
import type { Registration, Transform } from '@opencode/plugin/promise/registration';
import { fixture, skillIDs } from './fixtures.js';

export function skillInfo(id: string, content: string, autoinvoke = true): Skill.Info {
  return {
    id: id as Skill.Info['id'], name: id as Skill.Info['name'], description: `Source ${id}`,
    path: `/skills/${id}/SKILL.md` as Skill.Info['path'], content, autoinvoke,
  };
}

export const sourceSkills = () => skillIDs.map(id => skillInfo(id, fixture(id)));

export interface RegistryFaults {
  update?(id: string): void;
  addSkill?(id: string): void;
  addCommand?(name: string): void;
}

export class Skills implements SkillEditor {
  private readonly values = new Map<string, NonNullable<ReturnType<SkillEditor['get']>>>();

  constructor(source: readonly Skill.Info[], private readonly faults: RegistryFaults = {}) {
    for (const skill of source) this.values.set(skill.id, structuredClone(skill));
  }

  list() { return [...this.values.values()].map(skill => structuredClone(skill)); }
  get(id: string) { return structuredClone(this.values.get(id)); }
  add(skill: Skill.Info) {
    this.faults.addSkill?.(skill.id);
    this.values.set(skill.id, structuredClone(skill));
  }
  update(id: string, update: Parameters<SkillEditor['update']>[1]) {
    this.faults.update?.(id);
    const skill = this.get(id);
    if (!skill) return;
    update(skill);
    this.values.set(id, skill);
  }
  remove(id: string) { this.values.delete(id); }
}

function transforms<Editor>(rebuild: (callbacks: readonly ((editor: Editor) => void)[]) => void) {
  const callbacks = new Set<(editor: Editor) => void>();
  const replay = () => rebuild([...callbacks]);
  const transform: Transform<Editor> = async callback => {
    callbacks.add(callback);
    replay();
    return { dispose: async () => { callbacks.delete(callback); replay(); } };
  };
  return { transform, replay };
}

export function registry(source: readonly Skill.Info[] = sourceSkills(), faults: RegistryFaults = {}) {
  const originals = structuredClone(source);
  let skills = new Skills(originals, faults);
  const commands = new Map<string, CommandDefinition>();
  const skill = transforms<SkillEditor>(callbacks => {
    skills = new Skills(originals, faults);
    callbacks.forEach(callback => callback(skills));
  });
  const command = transforms<CommandEditor>(callbacks => {
    commands.clear();
    callbacks.forEach(callback => callback({ add(definition) {
      faults.addCommand?.(definition.name);
      commands.set(definition.name, definition);
    } }));
  });
  return {
    get skills() { return skills; }, commands, skill, command,
    rebuild() { skill.replay(); command.replay(); },
  };
}

// The host owns disposal. Each context tracks its own registrations so tests can
// unload/reload plugins without adding production cleanup or session machinery.
export function pluginContext(
  host: ReturnType<typeof registry>, session: Pick<Plugin.Context['session'], 'prompt'>,
  options: Plugin.Context['options'] = {},
) {
  const registrations: Registration[] = [];
  function domain<Editor>(transform: Transform<Editor>) {
    return strictCapabilities({ transform: async (callback: (editor: Editor) => void) => {
      const registration = await transform(callback);
      registrations.push(registration);
      return registration;
    } });
  }
  const ctx = strictCapabilities({
    options, session, skill: domain(host.skill.transform), command: domain(host.command.transform),
  }) as unknown as Plugin.Context;
  return { ctx, async dispose() {
    for (const registration of registrations.splice(0)) await registration.dispose();
  } };
}

function strictCapabilities<T extends object>(available: T): T {
  return new Proxy(available, { get(target, key, receiver) {
    if (!Object.hasOwn(target, key)) throw new Error(`Unexpected plugin capability: ${String(key)}`);
    return Reflect.get(target, key, receiver);
  } });
}
