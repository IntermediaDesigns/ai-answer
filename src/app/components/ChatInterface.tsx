"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: string[]; // Optional array of source URLs
};

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id") || crypto.randomUUID();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load conversation history
  useEffect(() => {
    const loadConversation = async () => {
      if (!isInitialLoad) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/chat?id=${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([
              {
                role: "ai",
                content:
                  "Hello! I can help you analyze web content. Just paste some URLs and ask me questions about them.",
              },
            ]);
          }
        } else {
          setMessages([
            {
              role: "ai",
              content:
                "Hello! I can help you analyze web content. Just paste some URLs and ask me questions about them.",
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
        setMessages([
          {
            role: "ai",
            content:
              "Hello! I can help you analyze web content. Just paste some URLs and ask me questions about them.",
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    loadConversation();
  }, [conversationId, isInitialLoad]);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add user message to the conversation
    const userMessage = { role: "user" as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, conversationId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add AI response to the conversation
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            content: data.content,
            sources: data.sources,
          },
        ]);
      } else {
        // Handle error response
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            content:
              data.error || "An error occurred while processing your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      // Add error message to conversation
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="w-full bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AI Web Analyzer</h1>
              <p className="text-gray-400 mt-1">
                Paste URLs and ask questions about web content
              </p>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("id", conversationId);
                navigator.clipboard.writeText(url.toString());
                alert("Conversation link copied to clipboard!");
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share Conversation
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4">
        <div className="max-w-4xl mx-auto px-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 mb-6 ${
                msg.role === "ai"
                  ? "justify-start"
                  : "justify-end flex-row-reverse"
              }`}
            >
              {/* Avatar */}
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
              )}

              {/* Message Content */}
              <div
                className={`px-6 py-4 rounded-2xl max-w-[85%] ${
                  msg.role === "ai"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-cyan-600 text-white"
                }`}
              >
                <div className="text-gray-100 whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Source Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Sources:</p>
                    <div className="space-y-1">
                      {msg.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-cyan-400 hover:text-cyan-300 truncate"
                        >
                          {source}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-center">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Paste URLs or ask questions..."
              rows={1}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400 resize-none"
              style={{
                minHeight: "48px",
                maxHeight: "120px",
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-cyan-600 text-white px-6 py-3 rounded-xl hover:bg-cyan-700 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? "Processing..." : "Send"}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Press Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
