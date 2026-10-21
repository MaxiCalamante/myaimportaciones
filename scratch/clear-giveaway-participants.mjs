import { createClient } from "@supabase/supabase-js";
import process from "node:process";
process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Resetting giveaway campaign...");
  const { data: campaign, error: cErr } = await db
    .from("giveaway_campaign")
    .update({
      active_round: null,
      snapshot: null,
      dataset_id: null,
      config: {
        title: "SORTEO DÍA DE LA MADRE",
        prize: "Travel Kit SKIN1004 Centella",
        permalink: "https://www.instagram.com/p/DeIpHXtkYyf/",
        scheduledFor: null,
        published: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select();

  if (cErr) {
    console.error("Error resetting campaign:", cErr);
    process.exit(1);
  }
  console.log("Giveaway campaign reset successfully:", campaign);

  console.log("Deleting giveaway rounds...");
  const { error: rErr } = await db.from("giveaway_rounds").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (rErr) {
    console.error("Error deleting giveaway rounds:", rErr);
  } else {
    console.log("Giveaway rounds deleted.");
  }

  console.log("Deleting giveaway admin events...");
  const { error: eErr } = await db.from("giveaway_admin_events").delete().gt("id", 0);
  if (eErr) {
    console.error("Error deleting giveaway admin events:", eErr);
  } else {
    console.log("Giveaway admin events deleted.");
  }

  // Verify public state
  const { data: pubData, error: pubErr } = await db.rpc("public_giveaway_v1");
  console.log("Public giveaway state now:", pubData, "error:", pubErr);
}

main();
