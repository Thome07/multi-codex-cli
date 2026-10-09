import React, { useState, useMemo } from "react";
import { marked } from "marked";
import {
  Send,
  Copy,
  Check,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";

interface MarkdownCompanionProps {
  onSendPrompt: (prompt: string) => void;
  terminalOutput: string;
}

export const MarkdownCompanion: React.FC<MarkdownCompanionProps> = ({
  onSendPrompt,
  terminalOutput,
}) => {
  const [activeTab, setActiveTab] = useState<"scratchpad" | "rendered">("scratchpad");
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);

  // Clean ANSI escape codes from terminal output for markdown rendering
  const cleanMarkdown = useMemo(() => {
    if (!terminalOutput) return "";
    // Remove ANSI escape sequences
    const cleaned = terminalOutput.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    );
    // Take the last 500 lines to keep it responsive
    const lines = cleaned.split("\n");
    return lines.slice(-400).join("\n");
  }, [terminalOutput]);

  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(cleanMarkdown || "_Nenhuma saída recebida ainda no terminal._", {
        gfm: true,
        breaks: true,
      }) as string;
    } catch {
      return "<p>Erro ao formatar saída Markdown.</p>";
    }
  }, [cleanMarkdown]);

  const handleSend = () => {
    if (!promptText.trim()) return;
    onSendPrompt(promptText);
    setPromptText("");
  };

  const handleCopyRendered = () => {
    navigator.clipboard.writeText(cleanMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#11131a] border-l border-[#242838] text-zinc-200">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#242838] bg-[#0c0e14]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("scratchpad")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === "scratchpad"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prompt Markdown</span>
          </button>
          <button
            onClick={() => setActiveTab("rendered")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === "rendered"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Saída Formatada</span>
          </button>
        </div>

        {activeTab === "rendered" && (
          <button
            onClick={handleCopyRendered}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-800 transition"
            title="Copiar texto puro limpo"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>
        )}

        {activeTab === "scratchpad" && promptText && (
          <button
            onClick={() => setPromptText("")}
            className="text-[11px] text-zinc-400 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition"
            title="Limpar texto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "scratchpad" ? (
          <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
            <div className="text-[11px] text-zinc-400 leading-snug">
              Escreva instruções complexas com blocos de código e envie diretamente para o OpenAI Codex CLI:
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Digite seu prompt em Markdown com blocos ``` código, requisitos ou instruções..."
              className="flex-1 w-full p-3 rounded-lg bg-[#08090d] border border-[#242838] text-xs font-mono text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-500 font-mono">
                Atalho: <kbd className="px-1 py-0.5 bg-zinc-800 rounded">Ctrl+Enter</kbd> para enviar
              </span>
              <button
                onClick={handleSend}
                disabled={!promptText.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-medium text-white transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para Terminal</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3 leading-relaxed select-text">
            <div
              className="prose prose-invert max-w-none text-zinc-300 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_pre]:bg-[#08090d] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[#242838] [&_code]:font-mono [&_code]:text-emerald-300 [&_pre_code]:text-zinc-200 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
