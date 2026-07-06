import { PageHeader, ComingSoon } from "@/components/page-header";

export default function NewRecipePage() {
  return (
    <>
      <PageHeader
        title="Add a recipe"
        description="Paste a caption to auto-fill, or enter it manually."
      />
      <ComingSoon note="The AI-paste importer and manual entry form land in Phase 4. Paste a TikTok/Instagram caption and Claude will draft the structured recipe for you to review." />
    </>
  );
}
