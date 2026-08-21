import { Nav } from "@/components/nav";
import { InstallPrompt } from "@/components/install-prompt";
import { TourProvider } from "@/components/tour/tour-provider";
import { tourInvitation } from "@/lib/tour";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout for the signed-in app: top bar on desktop, bottom tab bar on mobile.
 * The login page lives outside this group so it renders without app chrome.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, tour_seen_at")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const invitation = user
    ? tourInvitation(user.created_at, profile?.tour_seen_at)
    : null;

  return (
    <TourProvider invitation={invitation}>
      <Nav
        avatarUrl={profile?.avatar_url ?? null}
        signedIn={!!user}
        userId={user?.id ?? null}
      />
      {/* Bottom padding clears the mobile tab bar. */}
      <main className="pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
          <InstallPrompt />
          {children}
        </div>
      </main>
    </TourProvider>
  );
}
