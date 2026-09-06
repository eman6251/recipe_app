import "server-only";

import { cache } from "react";
import { createClient } from "./server";

/**
 * The signed-in user, fetched once per request.
 *
 * `auth.getUser()` isn't a cookie read — it calls Supabase to verify the token,
 * which is what makes it trustworthy and also what makes it a network round
 * trip. A single page render used to make several: the layout asked, then the
 * page asked, then whichever query helper it called asked again, each one
 * waiting on the last. React's `cache` collapses them into one for the
 * lifetime of the request.
 *
 * The proxy's own call can't join this — it runs before the render, in its own
 * invocation — so that one stays.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
