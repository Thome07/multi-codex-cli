import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Send,
  User,
  Bot,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { marked } from "marked";
import { api } from "../../services/api";
import type { ChatMessage, SessionInfo } from "../../types";
import { CodeBlock } from "./CodeBlock";

interface ConversationViewProps {
  session: SessionInfo;
  onSendPrompt: (prompt: string) => void;
  terminalOutput?: string;
}

// Parses raw markdown message text into text segments and code block segments
interface ContentPart {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseMessageContent(rawText: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    // Text prior to the code block
    if (match.index > lastIndex) {
      const textPart = rawText.substring(lastIndex, match.index);
      if (textPart.trim()) {
        parts.push({ type: "text", content: textPart });
      }
    }

    // Code block itself
    parts.push({
      type: "code",
      language: match[1] || "código",
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < rawText.length) {
    const trailingText = rawText.substring(lastIndex);
    if (trailingText.trim()) {
      parts.push({ type: "text", content: trailingText });
    }
  }

  if (parts.length === 0 && rawText.trim()) {
    parts.push({ type: "text", content: rawText });
  }

  return parts;
}

// Render rich markdown content (tables, bold, italics, inline code, lists, etc.)
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const html = useMemo(() => {
    try {
      return marked.parse(content, { gfm: true, breaks: true }) as string;
    } catch (e) {
      console.error("Erro ao converter markdown:", e);
      return content;
    }
  }, [content]);

  return (
    <div
      className="markdown-content text-[13px] leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  session,
  onSendPrompt,
  terminalOutput,
}) => {
  const [serverMessages, setServerMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Mensagens exibidas = histórico gravado pelo Codex + mensagens ainda não confirmadas.
  // Uma mensagem pendente some somente quando o Codex a grava no histórico (mesmo texto).
  const messages = useMemo(() => {
    const now = Date.now();
    const unconfirmed = pending.filter((p) => {
      if (now - p.timestampMs > 10 * 60 * 1000) return false;
      return !serverMessages.some(
        (m) =>
          m.role === "user" &&
          m.text.trim() === p.text.trim() &&
          m.timestampMs >= p.timestampMs - 15000
      );
    });
    return [...serverMessages, ...unconfirmed];
  }, [serverMessages, pending]);

  const fetchMessages = async () => {
    const latest = await api.getProfileMessages(session.profileId);
    setServerMessages((prev) => {
      const a = prev[prev.length - 1];
      const b = latest[latest.length - 1];
      if (prev.length === latest.length && a?.id === b?.id && a?.text === b?.text) {
        return prev;
      }
      return latest;
    });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      await fetchMessages();
    } catch (err) {
      console.error("Falha ao carregar histórico de mensagens:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [session.profileId]);

  // Aguardando resposta: última mensagem exibida é do usuário
  const isWaitingResponse = useMemo(() => {
    if (messages.length === 0) return false;
    return messages[messages.length - 1].role === "user";
  }, [messages]);

  // Poll: 1s enquanto aguarda resposta, 3s caso contrário
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchMessages().catch(() => {});
      },
      isWaitingResponse ? 1000 : 3000
    );
    return () => clearInterval(interval);
  }, [session.profileId, isWaitingResponse]);

  // Atualiza logo após atividade do terminal
  useEffect(() => {
    if (!terminalOutput) return;
    const timer = setTimeout(() => {
      fetchMessages().catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [terminalOutput, session.profileId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll, isWaitingResponse]);

  const handleSend = () => {
    const text = inputPrompt.trim();
    if (!text) return;
    onSendPrompt(text);
    setInputPrompt("");
    setPending((prev) => [
      ...prev,
      {
        id: "pending-" + Date.now(),
        role: "user",
        text,
        timestampMs: Date.now(),
      },
    ]);
    setAutoScroll(true);
  };

  const formatTimestamp = (timestampMs: number) => {
    if (!timestampMs) return "";
    const date = new Date(timestampMs);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-zinc-100 select-text overflow-hidden">
      {/* Conversation Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#12151e] border-b border-[#202534] select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Chat Interativo Codex</span>
          </div>
          <span className="text-zinc-500 text-xs">•</span>
          <span className="text-xs text-zinc-400 font-medium">
            {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"} registradas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMessages}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-[#1c202c] hover:bg-[#252b3b] transition cursor-pointer border border-[#2b3144]"
            title="Recarregar histórico agora"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        onScroll={(e) => {
          const target = e.currentTarget;
          const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
          setAutoScroll(isAtBottom);
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-emerald-600/30 border border-[#2c344a] flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-cyan-300" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-semibold text-white mb-1">
                Nenhuma mensagem gravada nesta sessão
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Envie um comando ou prompt abaixo. Suas mensagens aparecerão destacadas em{" "}
                <span className="text-blue-400 font-medium">Azul Real</span>, as respostas do Codex em{" "}
                <span className="text-emerald-400 font-medium">Esmeralda</span>, e os códigos retornados
                com <span className="text-pink-400 font-medium">Syntax Highlighting</span> completo!
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg pt-2">
              {[
                "Crie uma tabela com produtos, quantidade e preço com negrito",
                "Explique a arquitetura do projeto atual",
                "Escreva uma função Rust para ler arquivos com tratamento de erro",
                "Quais arquivos estão modificados no git status?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputPrompt(suggestion);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141722] hover:bg-[#1e2333] border border-[#232a3a] text-zinc-300 text-xs transition cursor-pointer text-left"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const parts = parseMessageContent(msg.text);

            return (
              <div
                key={msg.id || index}
                className={`flex flex-col gap-1 transition-all ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                {/* Author Badge & Timestamp */}
                <div
                  className={`flex items-center gap-2 px-1 select-none text-[11px] font-semibold ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {isUser ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-xs">
                      <User className="w-3 h-3 text-blue-300" />
                      <span>VOCÊ</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 shadow-xs">
                      <Bot className="w-3 h-3 text-emerald-300" />
                      <span>OPENAI CODEX</span>
                    </div>
                  )}

                  {msg.timestampMs > 0 && (
                    <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-normal">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(msg.timestampMs)}</span>
                    </div>
                  )}
                </div>

                {/* Message Body Card */}
                <div
                  className={`max-w-[88%] md:max-w-[82%] rounded-2xl px-4 py-3 shadow-lg transition-all ${
                    isUser
                      ? "bg-gradient-to-br from-[#121d33] to-[#18233f] text-blue-50 border border-blue-500/40 rounded-tr-xs"
                      : "bg-[#11141e] text-zinc-100 border border-[#262c3e] rounded-tl-xs"
                  }`}
                >
                  <div className="space-y-2 text-[13px] leading-relaxed break-words">
                    {parts.map((part, pIdx) => {
                      if (part.type === "code") {
                        return (
                          <CodeBlock
                            key={pIdx}
                            code={part.content}
                            language={part.language}
                          />
                        );
                      }
                      return (
                        <MarkdownContent key={pIdx} content={part.content} />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Animated waiting indicator when user prompt is submitted */}
        {isWaitingResponse && (
          <div className="flex flex-col gap-1 items-start animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold select-none">
              <Bot className="w-3 h-3 text-emerald-300" />
              <span>OPENAI CODEX</span>
            </div>
            <div className="bg-[#11141e] border border-emerald-500/30 rounded-2xl rounded-tl-xs px-4 py-3 text-zinc-200 text-xs flex items-center gap-3 shadow-lg">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-zinc-300 font-medium">Codex está processando sua resposta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Interactive Prompt Input */}
      <div className="p-3 bg-[#11141d] border-t border-[#222736] shrink-0">
        <div className="relative flex flex-col rounded-xl bg-[#0a0c10] border border-[#282f42] focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-xl transition">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  // Ctrl+Enter or Meta+Enter: insert newline at cursor
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const val = target.value;
                    setInputPrompt(val.substring(0, start) + "\n" + val.substring(end));
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 1;
                    }, 0);
                  }
                  // Shift+Enter inserts newline natively
                } else {
                  // Plain Enter: submit prompt!
                  e.preventDefault();
                  handleSend();
                }
              }
            }}
            placeholder="Digite sua mensagem para o Codex... (Enter para enviar, Ctrl+Enter para pular linha)"
            rows={2}
            className="w-full bg-transparent p-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none font-sans"
          />

          <div className="flex items-center justify-between px-3 py-2 border-t border-[#1c2130] bg-[#0e1017] rounded-b-xl select-none">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="hidden sm:inline">Pressione</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Enter
              </kbd>
              <span className="hidden sm:inline">para enviar •</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Ctrl + Enter
              </kbd>
              <span className="hidden sm:inline">para pular linha</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={!inputPrompt.trim()}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shadow-md ${
                  inputPrompt.trim()
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 font-semibold"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
