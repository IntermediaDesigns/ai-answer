import ChatInterface from "../../components/ChatInterface";

export default function Page({ params }: { params: { id: string } }) {
  return <ChatInterface initialConversationId={params.id} />;
}
