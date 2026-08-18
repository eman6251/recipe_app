import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RECOVERY_WINDOW_SECONDS } from "@/lib/recovery";

/**
 * Handles the link in Supabase confirmation emails (signup confirm, password
 * reset, etc.). Verifies the one-time token, which sets the session cookies,
 * then sends the user into the app.
 *
 * Two link shapes are accepted, because which one arrives depends on how the
 * email templates in the Supabase dashboard are written: `token_hash` + `type`
 * from a template using {{ .TokenHash }}, or `code` from the default
 * {{ .ConfirmationURL }}. Handling both means a reset email works either way.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Supabase reports its own failures (expired link, already used) this way.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (!providerError && (token_hash || code)) {
    const supabase = await createClient();

    const { error } = token_hash && type
      ? await supabase.auth.verifyOtp({ type, token_hash })
      : await supabase.auth.exchangeCodeForSession(code!);

    if (!error) {
      const response = NextResponse.redirect(new URL(next, request.url));

      // Mark that this session was opened by a recovery link, so the
      // reset-password page knows the user proved control of the mailbox
      // and needn't also produce the password they've forgotten.
      if (type === "recovery" || next.startsWith("/reset-password")) {
        response.cookies.set(RECOVERY_COOKIE, "1", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: RECOVERY_WINDOW_SECONDS,
        });
      }

      return response;
    }
  }

  const message =
    providerError ?? "Confirmation link is invalid or expired";
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
  );
}
