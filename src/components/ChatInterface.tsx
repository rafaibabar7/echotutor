// src/components/ChatInterface.tsx
// ADAPTED: Lovable UI + your existing /api/chat backend
// Changes from Lovable version:
//   1. Fetch URL: Supabase edge function → /api/chat
//   2. No Authorization header needed (Next.js API route uses server-side env)
//   3. Streaming: reads raw text chunks (not SSE data: lines)
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Send, Mic, MicOff } from "lucide-react";

interface ChatInterfaceProps {
  mode: "tutor" | "scenario" | "reference";
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  suggestedPrompts: string[];
}

const ChatInterface = ({
  mode,
  emptyStateTitle,
  emptyStateSubtitle,
  suggestedPrompts,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      // Keep last 20 messages for context
      const contextMessages = newMessages.slice(-20);

      try {
        // ---- ADAPTED: calls your Next.js API route, not Supabase ----
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: contextMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            mode,
          }),
        });

        if (!resp.ok) throw new Error(`Error: ${resp.status}`);

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No stream");

        // ---- ADAPTED: reads raw text chunks (not SSE data: lines) ----
        const decoder = new TextDecoder();
        let accumulated = "";

        // Add assistant placeholder
        setMessages([...newMessages, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages([
            ...newMessages,
            { role: "assistant", content: accumulated },
          ]);
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, mode]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      alert("Speech recognition is not supported in your browser. Try Chrome or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => prev + transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center pt-12">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {emptyStateTitle}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                {emptyStateSubtitle}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="echo-card p-4 text-left text-sm text-foreground hover:border-primary cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 text-[15px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-chat-user text-chat-user-foreground rounded-2xl rounded-br-lg"
                        : "bg-chat-assistant text-chat-assistant-foreground border border-border rounded-2xl rounded-bl-lg"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.content ? (
                        <div className="markdown-content">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-muted-foreground animate-pulse">
                          Thinking...
                        </span>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-chat-assistant border border-border rounded-2xl rounded-bl-lg px-4 py-3">
                    <span className="text-muted-foreground animate-pulse">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-card px-4 lg:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 echo-card p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground px-2 py-1.5 text-[15px]"
            />
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? "text-destructive animate-pulse-red"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            Press Enter to send · Shift+Enter for new line · Click mic for voice
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
