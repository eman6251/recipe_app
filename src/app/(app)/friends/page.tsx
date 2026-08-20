import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { FriendsHub } from "@/components/friends/friends-hub";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Friends"
        description="Swap codes, keep in touch, plan what to cook."
        info={
          <>
            Nobody can find you by browsing — the only ways in are the{" "}
            <strong>friend code</strong> you hand out and the author byline on a
            recipe you&apos;ve shared. Requests have to be accepted before
            either of you can send a message, and removing a friend takes a
            confirmation so it can&apos;t happen by accident. Group chats can
            only contain people you&apos;re already friends with.
          </>
        }
      />
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-black/10 bg-surface dark:border-white/10">
        <FriendsHub meId={user.id} active />
      </div>
    </>
  );
}
