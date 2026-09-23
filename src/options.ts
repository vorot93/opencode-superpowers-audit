import { z } from 'zod';

export interface AuditOptions {
  reviewers: Record<string, string>;
  maxRounds: number;
  artifactDirectory?: string;
}

export type OptionsResult =
  | { ok: true; value: AuditOptions }
  | { ok: false; message: string };

const author = z.string().regex(/^[^\s/#]+\/[^\s#]+$/);
const reviewer = z.string().regex(/^[^\s/#]+\/[^\s#]+(?:#[^\s#]+)?$/);
const schema = z.object({
  reviewers: z.record(author, reviewer).default({}),
  maxRounds: z.number().int().positive().default(5),
  artifactDirectory: z.string().trim().min(1).optional(),
}).strict();

export function parseOptions(input: unknown): OptionsResult {
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, message: parsed.error.issues.map(i => `${i.path.join('.') || 'options'}: ${i.message}`).join('\n') };
}
