"use client";

import ChatInterface from "../../components/ChatInterface";

export default function SharedChatPage({ params }: { params: { id: string } }) {
  return <ChatInterface initialConversationId={params.id} />;
}
