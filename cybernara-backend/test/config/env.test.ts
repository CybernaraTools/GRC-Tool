import { describe, expect, it } from "vitest";
import { readEnv } from "../../src/config/env.js";

const validEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  SUPABASE_DB_URL: "test-db-url-from-env",
  OPENAI_API_KEY: "test-openai-key"
};

describe("readEnv", () => {
  it("fails fast when required configuration is absent", () => {
    expect(() => readEnv({})).toThrow(/SUPABASE_URL/);
  });

  it("defaults OPENAI_MODEL at the configuration edge", () => {
    const env = readEnv(validEnv);
    expect(env.OPENAI_MODEL).toBe("gpt-4.1-mini");
  });
});
