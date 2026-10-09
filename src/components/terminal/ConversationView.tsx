import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Send,
  User,
  Bot,
  RefreshCw,
  Clock,
  Sparkles,
  Paperclip,
  FileCode,
  X,
  Download,
  Copy,
  Check,
  GitCommit,
  FileDiff,
  TestTube2,
  Wand2,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { marked } from "marked";
import type { ITheme } from "@xterm/xterm";
import { api } from "../../services/api";
import type { ChatMessage, SessionInfo } from "../../types";
import { CodeBlock } from "./CodeBlock";

interface ConversationViewProps {
  session: SessionInfo;
  onSendPrompt: (prompt: string) => void;
  terminalOutput?: string;
  fontSize?: number;
  theme?: ITheme;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  content: string;
  extension: string;
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
    if (match.index > lastIndex) {
      const textPart = rawText.substring(lastIndex, match.index);
      if (textPart.trim()) {
        parts.push({ type: "text", content: textPart });
      }
    }

    parts.push({
      type: "code",
      language: match[1] || "código",
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

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

// Format file size nicely
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      className="markdown-content leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  session,
  onSendPrompt,
  terminalOutput,
  fontSize = 13,
  theme,
}) => {
  const [serverMessages, setServerMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Background and text theme resolution
  const bgColor = theme?.background || "#0c0e14";
  const fgColor = theme?.foreground || "#f8fafc";

  // Mensagens exibidas = histórico do Codex + mensagens pendentes
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

  // Poll ágil: 1s se aguardando, 3s caso contrário
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchMessages().catch(() => {});
      },
      isWaitingResponse ? 1000 : 3000
    );
    return () => clearInterval(interval);
  }, [session.profileId, isWaitingResponse]);

  // Atualiza logo após saída do terminal
  useEffect(() => {
    if (!terminalOutput) return;
    const timer = setTimeout(() => {
      fetchMessages().catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [terminalOutput, session.profileId]);

  // Auto scroll para a última mensagem
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll, isWaitingResponse]);

  // Anexo de arquivos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 2 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" tem mais de 2MB e não pode ser anexado como texto.`);
        continue;
      }

      try {
        const textContent = await file.text();
        const ext = file.name.split(".").pop() || "";
        newAttachments.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          content: textContent,
          extension: ext,
        });
      } catch (err) {
        console.error("Falha ao ler arquivo:", file.name, err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = () => {
    const text = inputPrompt.trim();
    if (!text && attachedFiles.length === 0) return;

    let finalPrompt = text;
    if (attachedFiles.length > 0) {
      const filesFormatted = attachedFiles
        .map((f) => `--- Arquivo: ${f.name} ---\n\`\`\`${f.extension || ""}\n${f.content}\n\`\`\``)
        .join("\n\n");
      finalPrompt = text
        ? `${text}\n\n${filesFormatted}`
        : `Analise o(s) seguinte(s) arquivo(s) de código:\n\n${filesFormatted}`;
    }

    onSendPrompt(finalPrompt);
    setInputPrompt("");
    setAttachedFiles([]);
    setPending((prev) => [
      ...prev,
      {
        id: "pending-" + Date.now(),
        role: "user",
        text: finalPrompt,
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

  // Exportar conversa em Markdown
  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map((m) => {
        const author = m.role === "user" ? "### 👤 Você" : "### ⚡ OpenAI Codex";
        const time = m.timestampMs ? ` *(${new Date(m.timestampMs).toLocaleTimeString()})*` : "";
        return `${author}${time}\n\n${m.text}\n`;
      })
      .join("\n---\n\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codex-chat-${session.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copiar todo o chat em Markdown
  const handleCopyTranscript = () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map((m) => {
        const author = m.role === "user" ? "### 👤 Você" : "### ⚡ OpenAI Codex";
        const time = m.timestampMs ? ` *(${new Date(m.timestampMs).toLocaleTimeString()})*` : "";
        return `${author}${time}\n\n${m.text}\n`;
      })
      .join("\n---\n\n");

    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div
      className="flex flex-col h-full select-text overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: bgColor,
        color: fgColor,
        fontSize: `${fontSize}px`,
      }}
    >
      {/* Conversation Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#12151e]/90 border-b border-[#202534] select-none shrink-0 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Chat Interativo Codex</span>
          </div>
          <span className="text-zinc-500 text-xs">•</span>
          <span className="text-xs text-zinc-400 font-medium">
            {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Export & Copy Chat */}
          {messages.length > 0 && (
            <>
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-[#171a24] hover:bg-[#202534] transition cursor-pointer border border-[#272b38]"
                title="Copiar conversa completa em Markdown"
              >
                {copiedTranscript ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 hidden sm:inline">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span className="hidden sm:inline">Copiar MD</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-[#171a24] hover:bg-[#202534] transition cursor-pointer border border-[#272b38]"
                title="Exportar conversa para arquivo .md"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </>
          )}

          {/* Clear View */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                setServerMessages([]);
                setPending([]);
              }}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 px-2 py-1 rounded bg-[#171a24] hover:bg-[#202534] transition cursor-pointer border border-[#272b38]"
              title="Limpar mensagens visíveis na tela"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}

          {/* Refresh Messages */}
          <button
            onClick={loadMessages}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-[#171a24] hover:bg-[#202534] transition cursor-pointer border border-[#272b38]"
            title="Recarregar histórico agora"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
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
                Envie um comando, prompt ou anexe um arquivo abaixo. Suas mensagens aparecerão destacadas em{" "}
                <span className="text-blue-400 font-medium">Azul Real</span>, as respostas do Codex em{" "}
                <span className="text-emerald-400 font-medium">Esmeralda</span>, com tabelas e códigos em{" "}
                <span className="text-pink-400 font-medium">Syntax Highlighting</span> completo!
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
                  className="px-2.5 py-1.5 rounded-lg bg-[#141722] hover:bg-[#1e2333] border border-[#232a3a] text-zinc-300 text-xs transition cursor-pointer text-left shadow-xs"
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
                  <div className="space-y-2 leading-relaxed break-words">
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

      {/* Dev Quick Actions Toolbar */}
      <div className="px-3 py-1.5 bg-[#0f111a] border-t border-[#1e2230] flex items-center gap-1.5 overflow-x-auto select-none shrink-0 scrollbar-none">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-purple-400" />
          Ações:
        </span>

        <button
          onClick={() => setInputPrompt("Revise o git status e o git diff das alterações não comitadas, aponte potenciais problemas e melhorias.")}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b26] hover:bg-[#222736] border border-[#272d3e] text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          title="Pedir revisão das alterações não comitadas"
        >
          <FileDiff className="w-3 h-3 text-blue-400" />
          <span>Revisar Git</span>
        </button>

        <button
          onClick={() => setInputPrompt("Verifique o git status e as alterações recentes e sugira uma mensagem de commit semântica (Conventional Commits) clara e profissional.")}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b26] hover:bg-[#222736] border border-[#272d3e] text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          title="Gerar mensagem de commit para o git"
        >
          <GitCommit className="w-3 h-3 text-emerald-400" />
          <span>Gerar Commit</span>
        </button>

        <button
          onClick={() => setInputPrompt("Escreva testes unitários completos com casos de sucesso e tratamento de erros para as funções recentes deste projeto.")}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b26] hover:bg-[#222736] border border-[#272d3e] text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          title="Gerar testes unitários para o código"
        >
          <TestTube2 className="w-3 h-3 text-amber-400" />
          <span>Gerar Testes</span>
        </button>

        <button
          onClick={() => setInputPrompt("Refatore o código recente aplicando boas práticas de clean code, segurança de tipos e otimização de performance.")}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b26] hover:bg-[#222736] border border-[#272d3e] text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          title="Refatorar e otimizar código"
        >
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>Refatorar</span>
        </button>

        <button
          onClick={() => setInputPrompt("Explique passo a passo o funcionamento deste código com exemplos práticos.")}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171b26] hover:bg-[#222736] border border-[#272d3e] text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          title="Explicar lógica do código"
        >
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          <span>Explicar Código</span>
        </button>
      </div>

      {/* Bottom Interactive Prompt Input with File Attachment */}
      <div className="p-3 bg-[#11141d]/95 border-t border-[#202534] shrink-0 backdrop-blur-xs">
        {/* Attached Files Chips Bar */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 mb-1.5 bg-[#141824] border border-blue-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-1">
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider self-center mr-1">
              Anexos ({attachedFiles.length}):
            </span>
            {attachedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1d2334] border border-blue-500/40 text-xs text-blue-100 shadow-xs"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] font-medium max-w-[130px] truncate">{f.name}</span>
                <span className="text-[10px] text-zinc-400">({formatFileSize(f.size)})</span>
                <button
                  onClick={() => removeAttachedFile(f.id)}
                  className="hover:text-red-400 transition cursor-pointer ml-0.5"
                  title="Remover anexo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex flex-col rounded-xl bg-[#0a0c10] border border-[#282f42] focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-xl transition">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
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
                } else {
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
            {/* Left Controls: File Attachment button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161a26] hover:bg-[#202636] border border-[#272d3e] text-zinc-300 hover:text-white transition cursor-pointer text-xs"
                title="Anexar arquivo de código para o Codex analisar"
              >
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-[11px]">Anexar Arquivo</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 ml-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Enter
                </kbd>
                <span>enviar •</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Ctrl+Enter
                </kbd>
                <span>pular linha</span>
              </div>
            </div>

            {/* Right Controls: Character count & Send button */}
            <div className="flex items-center gap-2">
              {inputPrompt.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">
                  {inputPrompt.length} chars
                </span>
              )}

              <button
                onClick={handleSend}
                disabled={!inputPrompt.trim() && attachedFiles.length === 0}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shadow-md ${
                  inputPrompt.trim() || attachedFiles.length > 0
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
