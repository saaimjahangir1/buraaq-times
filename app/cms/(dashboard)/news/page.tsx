import { redirect } from "next/navigation";
import { canAccessType } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import PostTable from "@/components/cms/PostTable";

export default async function CmsNewsListPage() {
  const user = await getCurrentUser();
  if (!user || user.writer !== "APPROVED" || !canAccessType(user.role, "news")) redirect("/cms");
  return <PostTable type="news" />;
}
