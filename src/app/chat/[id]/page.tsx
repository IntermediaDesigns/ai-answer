import { Metadata } from "next";
import ChatInterface from "../../components/ChatInterface";

type Props = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: "Shared Chat",
  description: "View a shared chat conversation",
};

export default async function SharedChatPage({ params }: Props) {
  // We could fetch initial data here if needed
  return <ChatInterface initialConversationId={params.id} />;
}
