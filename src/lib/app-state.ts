import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Petit stockage clé/valeur des tâches planifiées (table app_state). */

export async function readState<T>(db: SupabaseClient, key: string): Promise<T | null> {
  const { data, error } = await db.from("app_state").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`app_state : ${error.message}`);
  return (data?.value as T) ?? null;
}

export async function writeState(db: SupabaseClient, key: string, value: unknown) {
  const { error } = await db.from("app_state").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`app_state : ${error.message}`);
}
