import { redirect } from "next/navigation";
import { getSession, canAccessType } from "@/lib/auth";
import PostTable from "@/components/cms/PostTable";

export default async function CmsArticlesListPage() {
  const session = await getSession();
  if (!session || !canAccessType(session.role, "article")) redirect("/cms");
  return <PostTable type="article" />;
}
