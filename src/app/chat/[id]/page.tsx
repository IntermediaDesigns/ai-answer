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

export default function Page(props: Props) {
  return <ChatInterface initialConversationId={props.params.id} />
}
