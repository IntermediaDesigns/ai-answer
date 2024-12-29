import { Metadata } from "next";
import ChatInterface from "../../components/ChatInterface";

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Shared Chat - ${params.id}`,
    description: "View a shared chat conversation",
  };
}

// Mark as server component
export const dynamic = 'force-dynamic';

export default async function Page(props: Props) {
  // Could fetch initial data here if needed
  // const data = await fetchInitialData(props.params.id);
  
  return <ChatInterface initialConversationId={props.params.id} />;
}
