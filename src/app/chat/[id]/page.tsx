import { Metadata } from "next";
import ChatInterface from "../../components/ChatInterface";

type Props = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: "Shared Chat",
  description: "View a shared chat conversation",
};

export default function SharedChatPage({ params }: Props) {
  return <ChatInterface initialConversationId={params.id} />;
}
