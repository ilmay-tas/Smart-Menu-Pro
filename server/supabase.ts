import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || "menu-images";

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL must be set");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseMenuBucket = supabaseBucket;
export const supabasePublicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}`;
