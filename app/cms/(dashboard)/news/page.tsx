import { redirect } from "next/navigation";
import { getSession, canAccessType } from "@/lib/auth";
import PostTable from "@/components/cms/PostTable";

export default async function CmsNewsListPage() {
  const session = await getSession();
  if (!session || !canAccessType(session.role, "news")) redirect("/cms");
  return <PostTable type="news" />;
}
