import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Single-pass lexical tokenizer: matches source code directly and outputs safe HTML
// Prevents regex from ever matching generated <span class="..."> attributes
function highlightSyntax(rawCode: string, lang?: string): string {
  const normalizedLang = (lang || "").toLowerCase().trim();
  const isHashComment = ["py", "python", "bash", "sh", "yaml", "yml", "dockerfile"].includes(normalizedLang);

  const commentPattern = isHashComment
    ? "(#[^\\n]*)"
    : "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)";

  const stringPattern = '("(?:\'\'|\\\\.|[^"\\\\])*"|\'(?:\'\'|\\\\.|[^\'\\\\])*\'|`(?:\'\'|\\\\.|[^`\\\\])*`)';

  const keywordPattern =
    "\\b(const|let|var|function|return|if|else|elif|for|while|import|export|from|as|class|interface|type|fn|pub|struct|enum|impl|match|def|async|await|try|except|finally|catch|self|this|mut|use|mod|trait|where|select|insert|update|delete|echo|sudo|cargo|npm|npx|lambda|pass|raise|yield|with|in|is|not|and|or|break|continue)\\b";

  const booleanPattern = "\\b(True|False|true|false|None|null|undefined|Some|Ok|Err)\\b";
  const numberPattern = "\\b(\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b";
  const functionPattern = "\\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\\s*\\()";
  const typePattern = "\\b([A-Z][a-zA-Z0-9_]*)\\b";

  const combinedRegex = new RegExp(
    [
      commentPattern,   // group 1
      stringPattern,    // group 2
      keywordPattern,   // group 3
      booleanPattern,   // group 4
      numberPattern,    // group 5
      functionPattern,  // group 6
      typePattern,      // group 7
    ].join("|"),
    "g"
  );

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(rawCode)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(rawCode.slice(lastIndex, match.index));
    }

    const [matchedText, comment, str, kw, bool, num, fn, typ] = match;

    if (comment !== undefined) {
      result += `<span class="text-zinc-500 italic">${escapeHtml(comment)}</span>`;
    } else if (str !== undefined) {
      result += `<span class="text-emerald-400 font-medium">${escapeHtml(str)}</span>`;
    } else if (kw !== undefined) {
      result += `<span class="text-pink-400 font-semibold">${escapeHtml(kw)}</span>`;
    } else if (bool !== undefined) {
      result += `<span class="text-amber-300 font-semibold">${escapeHtml(bool)}</span>`;
    } else if (num !== undefined) {
      result += `<span class="text-amber-400 font-mono">${escapeHtml(num)}</span>`;
    } else if (fn !== undefined) {
      result += `<span class="text-cyan-400 font-medium">${escapeHtml(fn)}</span>`;
    } else if (typ !== undefined) {
      result += `<span class="text-purple-400 font-medium">${escapeHtml(typ)}</span>`;
    } else {
      result += escapeHtml(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < rawCode.length) {
    result += escapeHtml(rawCode.slice(lastIndex));
  }

  return result;
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
