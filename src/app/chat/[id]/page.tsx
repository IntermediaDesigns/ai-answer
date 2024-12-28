import ChatInterface from "../../components/ChatInterface";

export default function SharedChatPage({
  params,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <ChatInterface initialConversationId={params.id} />;
}
