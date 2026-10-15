import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { fetchApi, SOCKET_URL } from "@/lib/api";
import { Bot, Paperclip, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — Helix" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "ai"; text: string; time: string; fallback?: boolean };

const initial: Msg[] = [
  {
    id: "1",
    role: "ai",
    text: "Hi there! I'm your AI support agent. Ask me anything about your account, billing, or product features.",
    time: "Now",
  },
];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isHuman, setIsHuman] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.io
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("accessToken") || undefined },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", sessionId);
    });

    socket.on("chat_status_changed", (data) => {
      if (data.status === "human") {
        setIsHuman(true);
        toast.info(data.message);
      }
    });

    socket.on("receive_message", (data) => {
      if (data.sender === "admin") {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "ai", // Display admin as AI bubble for now
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          },
        ]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text, time: now }]);
    setInput("");

    // If human took over, send via socket
    if (isHuman && socketRef.current) {
      socketRef.current.emit("send_message", { chatId: sessionId, sender: "user", text });
      return;
    }

    setTyping(true);
    try {
      const data = await fetchApi("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, sessionId }),
      });
      let rawReply = data.reply || "Error: No response from server.";
      let isFallback = false;
      if (rawReply.includes("[FALLBACK_MODE]")) {
        isFallback = true;
        rawReply = rawReply.replace("[FALLBACK_MODE]", "").trim();
      }
      if (rawReply.includes("ESCALATION_TRIGGERED")) {
        isFallback = true;
        rawReply = rawReply.replace("ESCALATION_TRIGGERED", "").trim();
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: rawReply,
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          fallback: isFallback,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="helix-chat-page relative flex h-screen flex-col overflow-hidden mesh-bg">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-25" />
      <header className="helix-chat-header relative z-20 flex items-center justify-between border-b bg-card/70 px-4 py-3.5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="relative">
            <Avatar className="h-10 w-10 shadow-md shadow-primary/15">
              <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500 text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success shadow-[0_0_0_3px_color-mix(in_oklab,var(--success)_18%,transparent)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-semibold">
                {isHuman ? "Human Agent" : "AI Support Agent"}
              </h1>
              <span className="hidden items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Active now
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Typically replies instantly</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div ref={scrollRef} className="helix-chat-messages relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-7 sm:py-10">
          <div className="animate-reveal flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Today
            </span>
            <span className="h-px flex-1 bg-border/70" />
          </div>
          {messages.map((m, index) => (
            <div
              key={m.id}
              style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
              className={cn("flex gap-3 animate-reveal", m.role === "user" && "flex-row-reverse")}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    m.role === "ai"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {m.role === "ai" ? <Bot className="h-4 w-4" /> : "U"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn("max-w-[80%] space-y-1", m.role === "user" && "items-end text-right")}
              >
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm transition-shadow duration-300 hover:shadow-md",
                    m.role === "ai"
                      ? "rounded-tl-sm border-border/70 bg-card/85 text-foreground backdrop-blur"
                      : "rounded-tr-sm border-primary/30 bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-primary/15",
                  )}
                >
                  {m.text}
                </div>
                <div className="flex items-center gap-2 px-1">
                  <p className="text-[11px] text-muted-foreground">{m.time}</p>
                  {m.fallback && (
                    <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-medium text-warning-foreground">
                      Fallback
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-3 animate-reveal">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accent text-accent-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border bg-card/85 px-4 py-3 shadow-sm backdrop-blur">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="ml-1.5 text-[11px] text-muted-foreground">Helix is thinking</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="helix-chat-composer relative z-20 border-t bg-card/72 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-end gap-2 rounded-2xl border bg-background/80 p-2 shadow-lg shadow-primary/5 transition-all duration-300 focus-within:border-primary/40 focus-within:shadow-xl focus-within:shadow-primary/10 focus-within:ring-2 focus-within:ring-ring/35">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => toast.info("Attachment support coming soon")}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your message…"
              aria-label="Message. Press Shift and Enter for a new line."
              rows={1}
              className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || typing}
              size="icon"
              className="button-sheen shrink-0 rounded-xl shadow-md shadow-primary/15"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 px-2 text-center text-[11px] text-muted-foreground">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
