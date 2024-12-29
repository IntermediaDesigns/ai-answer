import { Metadata } from "next";
import ChatInterface from "../../components/ChatInterface";

// Update Props type to match Next.js page props structure
type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
};

export const metadata: Metadata = {
  title: "Shared Chat",
  description: "View a shared chat conversation",
};

export default function SharedChatPage({ params }: Props) {
  // Remove async since we're not doing any data fetching yet
  return <ChatInterface initialConversationId={params.id} />;
}