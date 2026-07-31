import { Nav } from "@/components/nav";

/**
 * Layout for the signed-in app: sidebar on desktop, bottom tab bar on mobile.
 * The login page lives outside this group so it renders without app chrome.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav />
      {/* Bottom padding clears the mobile tab bar. */}
      <main className="pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </>
  );
}
