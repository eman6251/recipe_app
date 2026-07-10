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
      {/* Offset for sidebar (desktop) / bottom bar (mobile) */}
      <main className="md:pl-60 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </>
  );
}
