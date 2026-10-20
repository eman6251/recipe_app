import { createClient } from "@supabase/supabase-js";

/**
 * Keeps the Supabase project from being paused for inactivity.
 *
 * Free-tier projects pause after about a week with no API traffic, and a
 * paused project doesn't fail loudly — its hostname stops resolving, so every
 * query sits there until the connection times out and the app renders as
 * though the account were empty. This route is the cheapest possible real API
 * request, run on a schedule so that week never elapses.
 *
 * It has to be an *external* HTTP request to the project's API. A job running
 * inside the database — pg_cron and friends — is not traffic Supabase counts,
 * so a database that is busy entirely with its own cron can still be judged
 * idle and paused.
 *
 * Deliberately not using the cookie-bound server client: there's no user here,
 * and this should work out of a scheduler with no session at all.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel signs scheduled invocations with CRON_SECRET when it's set. Without
  // the check this is an open endpoint that anyone could hammer against the
  // database, which is the opposite of the point.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, error: "Supabase is not configured" }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // One row from a table anonymous callers may read anyway. The point is the
    // round trip, not the data.
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw new Error(error.message);

    return Response.json({ ok: true, ms: Date.now() - startedAt });
  } catch (err) {
    // A 500 is what makes this worth having: Vercel records failed cron runs,
    // so a project that paused anyway leaves a trail instead of being noticed
    // weeks later by someone wondering why the app got slow.
    return Response.json(
      {
        ok: false,
        ms: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
