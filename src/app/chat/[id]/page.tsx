import ChatInterface from "../../components/ChatInterface";

interface PageProps {
  params: {
    id: string;
  };
}

export default function SharedChatPage({ params }: PageProps) {
  return <ChatInterface initialConversationId={params.id} />;
}
