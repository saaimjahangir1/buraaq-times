import PostEditor from "@/components/cms/PostEditor";

export default function EditArticlePage({ params }: { params: { id: string } }) {
  return <PostEditor type="article" postId={params.id} />;
}
