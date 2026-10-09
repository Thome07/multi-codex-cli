import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Lightweight, safe syntax highlighter using regex tokenization
function highlightSyntax(rawCode: string, lang?: string): string {
  const normalizedLang = (lang || "").toLowerCase().trim();

  // Escape HTML entities first
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const lines = rawCode.split("\n");

  const highlightedLines = lines.map((line) => {
    // Check for full line or end of line comments
    let commentPart = "";
    let codePart = line;

    const commentIndexSlash = line.indexOf("//");
    const commentIndexHash = normalizedLang === "python" || normalizedLang === "bash" || normalizedLang === "sh" 
      ? line.indexOf("#") 
      : -1;

    let commentIdx = -1;
    if (commentIndexSlash !== -1 && commentIndexHash !== -1) {
      commentIdx = Math.min(commentIndexSlash, commentIndexHash);
    } else if (commentIndexSlash !== -1) {
      commentIdx = commentIndexSlash;
    } else if (commentIndexHash !== -1) {
      commentIdx = commentIndexHash;
    }

    if (commentIdx !== -1) {
      codePart = line.slice(0, commentIdx);
      commentPart = line.slice(commentIdx);
    }

    let processed = escapeHtml(codePart);

    // 1. Strings: "...", '...', `...`
    processed = processed.replace(
      /(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')/g,
      '<span class="text-emerald-400 font-medium">$1</span>'
    );

    // 2. Keywords
    const keywords =
      /\b(const|let|var|function|return|if|else|for|while|import|export|from|as|class|interface|type|fn|pub|struct|enum|impl|match|def|async|await|try|catch|self|this|mut|use|mod|trait|where|select|from|where|insert|update|delete|echo|sudo|cargo|npm|npx)\b/g;
    processed = processed.replace(
      keywords,
      '<span class="text-pink-400 font-semibold">$1</span>'
    );

    // 3. Types and PascalCase names
    processed = processed.replace(
      /\b([A-Z][a-zA-Z0-9_]*)\b/g,
      '<span class="text-purple-400 font-medium">$1</span>'
    );

    // 4. Function calls
    processed = processed.replace(
      /\b([a-zA-Z0-9_]+)(?=\s*\()/g,
      '<span class="text-cyan-400 font-medium">$1</span>'
    );

    // 5. Numbers and booleans
    processed = processed.replace(
      /\b(\d+(\.\d+)?|true|false|null|undefined|None|Some|Ok|Err)\b/g,
      '<span class="text-amber-400 font-mono">$1</span>'
    );

    // Reattach comment if present
    if (commentPart) {
      processed += `<span class="text-zinc-500 italic">${escapeHtml(commentPart)}</span>`;
    }

    return processed;
  });

  return highlightedLines.join("\n");
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const displayLang = language?.trim() || "código";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedHtml = highlightSyntax(code, language);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#2a3044] bg-[#090b10] shadow-xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141722] border-b border-[#232838] select-none">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            {displayLang}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 hover:text-white px-2 py-1 rounded bg-[#1f2434] hover:bg-[#2b3248] transition cursor-pointer"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3.5 overflow-x-auto text-[12.5px] font-mono leading-relaxed text-zinc-200">
        <pre
          className="whitespace-pre font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
    </div>
  );
};
