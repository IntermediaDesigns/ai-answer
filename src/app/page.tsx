import { Suspense } from "react";
import ChatInterface from "./components/ChatInterface";
import LoadingSpinner from "./components/LoadingSpinner";

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChatInterface />
    </Suspense>
  );
}
