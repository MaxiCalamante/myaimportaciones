import { getAdminClient } from '@/lib/admin-auth';
import { INSTAGRAM_CONSOLE_SCRIPT } from '@/lib/giveaway/instagram-console-source';
import { fail, response } from '@/lib/giveaway/server/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { await getAdminClient(); return response({ script: INSTAGRAM_CONSOLE_SCRIPT }); }
  catch (error) { return fail(error); }
}
