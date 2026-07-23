import { Module, type Provider } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { readEnv } from "../../config/env.js";

export const SUPABASE_SERVICE_CLIENT = Symbol("SUPABASE_SERVICE_CLIENT");

const supabaseServiceProvider: Provider = {
  provide: SUPABASE_SERVICE_CLIENT,
  useFactory: () => {
    const env = readEnv();
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
};

@Module({
  providers: [supabaseServiceProvider],
  exports: [SUPABASE_SERVICE_CLIENT]
})
export class SupabaseModule {}

