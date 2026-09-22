import PostEditor from "@/components/cms/PostEditor";

export default function EditNewsPage({ params }: { params: { id: string } }) {
  return <PostEditor type="news" postId={params.id} />;
}
