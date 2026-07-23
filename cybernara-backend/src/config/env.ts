import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_URL: z.string().min(1),
  // G-10 cutover: the non-owner role the application connects as once
  // database.module.ts is switched over. Optional so environments that only
  // set SUPABASE_DB_URL keep working during the staged rollout;
  // database.module.ts falls back to SUPABASE_DB_URL if this is unset.
  SUPABASE_APP_RUNTIME_DB_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  EVIDENCE_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  EVIDENCE_UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .min(1)
    .default(
      [
        "application/pdf",
        "application/json",
        "text/plain",
        "text/csv",
        "image/png",
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ].join(",")
    )
});

export type CybernaraEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): CybernaraEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Cybernara configuration is invalid: ${details}`);
  }

  return parsed.data;
}
