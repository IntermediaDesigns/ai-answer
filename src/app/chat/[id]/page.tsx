import { Metadata } from "next";
import ChatInterface from "../../components/ChatInterface";

// Remove custom Props type and use Next.js page props pattern
export default function SharedChatPage({
  params,
}: {
  params: { id: string };
}) {
  return <ChatInterface initialConversationId={params.id} />;
}

export const metadata: Metadata = {
  title: "Shared Chat",
  description: "View a shared chat conversation",
};