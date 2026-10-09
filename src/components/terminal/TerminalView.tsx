import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { api } from "../../services/api";
import type { AppSettings, SessionInfo } from "../../types";
import { TERMINAL_THEMES } from "./themes";
import { MarkdownCompanion } from "./MarkdownCompanion";
import {
  Terminal as TerminalIcon,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Columns,
  Maximize2,
  Trash2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Palette,
  BookOpen,
} from "lucide-react";

interface TerminalViewProps {
  session: SessionInfo;
  settings: AppSettings;
  isActive: boolean;
  onSessionExit?: (sessionId: string, exitCode?: number | null) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  session,
  settings,
  isActive,
  onSessionExit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  const [hasExited, setHasExited] = useState(!session.isAlive);
  const [exitCode, setExitCode] = useState<number | null | undefined>(null);

  // Appearance & State
  const [fontSize, setFontSize] = useState<number>(settings.terminalFontSize || 13);
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem("codex_terminal_theme") || "ghostty";
  });
  const [viewMode, setViewMode] = useState<"terminal" | "split" | "markdown">("terminal");
  const [outputBuffer, setOutputBuffer] = useState<string>("");
  const [copiedAll, setCopiedAll] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);

  // Theme resolution
  const activeTheme = TERMINAL_THEMES[currentThemeId]?.theme || TERMINAL_THEMES.ghostty.theme;

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: settings.terminalCursorBlink,
      cursorStyle: (settings.terminalCursorStyle as any) || "block",
      fontSize: fontSize,
      fontFamily: settings.terminalFontFamily || "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
      lineHeight: settings.terminalLineHeight || 1.25,
      scrollback: settings.terminalScrollback || 10000,
      theme: activeTheme,
      allowTransparency: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Initial fit and resize report to Rust PTY backend
    setTimeout(() => {
      try {
        fitAddon.fit();
        api.resizeSession(session.id, term.cols, term.rows);
      } catch (e) {
        console.error("Initial fit failed:", e);
      }
    }, 60);

    // Forward user keystrokes to Rust backend PTY
    const onDataDisposable = term.onData((data) => {
      api.writeSession(session.id, data).catch((err) => {
        console.error("Failed to write to PTY:", err);
      });
    });

    // Listen to streaming output from Rust backend
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    api.onPtyOutput((payload) => {
      if (payload.sessionId === session.id) {
        term.write(payload.data);
        setOutputBuffer((prev) => (prev + payload.data).slice(-150000));
      }
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    api.onPtyExit((payload) => {
      if (payload.sessionId === session.id) {
        setHasExited(true);
        setExitCode(payload.exitCode);
        onSessionExit?.(session.id, payload.exitCode);
      }
    }).then((unlisten) => {
      unlistenExit = unlisten;
    });

    // Auto-fit on window / element resize
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
        try {
          fitAddon.fit();
          api.resizeSession(session.id, term.cols, term.rows);
        } catch (_) {}
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      resizeObserver.disconnect();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      term.dispose();
    };
  }, [session.id]);

  // Update theme dynamically
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = activeTheme;
    }
  }, [activeTheme]);

  // Update font size dynamically
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = fontSize;
      try {
        fitAddonRef.current?.fit();
        if (termRef.current) {
          api.resizeSession(session.id, termRef.current.cols, termRef.current.rows);
        }
      } catch (_) {}
    }
  }, [fontSize, session.id]);

  // When tab becomes active or viewMode changes, refocus and fit terminal
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
          if (termRef.current) {
            api.resizeSession(session.id, termRef.current.cols, termRef.current.rows);
          }
        } catch (_) {}
      }, 50);
    }
  }, [isActive, viewMode]);

  // Search handlers
  const handleSearchNext = useCallback(() => {
    if (!searchAddonRef.current || !searchQuery) return;
    searchAddonRef.current.findNext(searchQuery, {
      caseSensitive: searchCaseSensitive,
      incremental: false,
    });
  }, [searchQuery, searchCaseSensitive]);

  const handleSearchPrev = useCallback(() => {
    if (!searchAddonRef.current || !searchQuery) return;
    searchAddonRef.current.findPrevious(searchQuery, {
      caseSensitive: searchCaseSensitive,
    });
  }, [searchQuery, searchCaseSensitive]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!searchAddonRef.current) return;
    if (query) {
      searchAddonRef.current.findNext(query, {
        caseSensitive: searchCaseSensitive,
        incremental: true,
      });
    } else {
      searchAddonRef.current.clearDecorations();
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        searchAddonRef.current?.clearDecorations();
        termRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isSearchOpen]);

  // Action handlers
  const handleClearTerminal = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  const handleCopyAll = () => {
    if (!termRef.current) return;
    termRef.current.selectAll();
    const selection = termRef.current.getSelection();
    termRef.current.clearSelection();
    navigator.clipboard.writeText(selection || outputBuffer);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSendPromptFromCompanion = (prompt: string) => {
    // Send prompt with carriage return to PTY
    api.writeSession(session.id, prompt + "\n").catch((e) => {
      console.error("Falha ao enviar prompt:", e);
    });
    termRef.current?.focus();
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentThemeId(themeId);
    localStorage.setItem("codex_terminal_theme", themeId);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#0c0e14] ${
        isActive ? "block" : "hidden"
      }`}
    >
      {/* Top Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#202432] bg-[#11131a] text-zinc-300 text-xs shrink-0 select-none">
        {/* Left: Session metadata & font controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-zinc-200">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: session.profileColor || "#3b82f6" }}
            />
            <span className="font-semibold text-xs tracking-wide">{session.title}</span>
          </div>

          <div className="h-3.5 w-px bg-zinc-700/60 mx-1" />

          {/* Font Controls */}
          <div className="flex items-center gap-0.5 bg-[#171a24] border border-[#272b38] rounded-md px-1 py-0.5">
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="p-1 hover:text-white rounded hover:bg-zinc-700/50 transition cursor-pointer"
              title="Diminuir fonte (A-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[11px] font-mono text-zinc-400">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="p-1 hover:text-white rounded hover:bg-zinc-700/50 transition cursor-pointer"
              title="Aumentar fonte (A+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-[#171a24] border border-[#272b38] rounded-md px-1.5 py-0.5">
            <Palette className="w-3 h-3 text-zinc-400" />
            <select
              value={currentThemeId}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-transparent text-[11px] text-zinc-300 focus:outline-none cursor-pointer pr-1"
            >
              {Object.values(TERMINAL_THEMES).map((t) => (
                <option key={t.id} value={t.id} className="bg-[#171a24] text-zinc-200">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Search, Clear, Copy & View Mode */}
        <div className="flex items-center gap-1.5">
          {/* Search Trigger */}
          <button
            onClick={() => setIsSearchOpen((v) => !v)}
            className={`p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] ${
              isSearchOpen
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Buscar no terminal (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buscar</span>
          </button>

          {/* Copy Buffer */}
          <button
            onClick={handleCopyAll}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Copiar texto do terminal"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedAll ? "Copiado!" : "Copiar"}</span>
          </button>

          {/* Clear Terminal */}
          <button
            onClick={handleClearTerminal}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Limpar tela do terminal (Ctrl+L)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>

          <div className="h-3.5 w-px bg-zinc-700/60 mx-1" />

          {/* View Mode Toggle: Terminal / Split / Markdown */}
          <div className="flex items-center bg-[#171a24] border border-[#272b38] rounded-md p-0.5">
            <button
              onClick={() => setViewMode("terminal")}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition cursor-pointer ${
                viewMode === "terminal"
                  ? "bg-blue-600 text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Visualização: Apenas Terminal"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden md:inline">Terminal</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition cursor-pointer ${
                viewMode === "split"
                  ? "bg-blue-600 text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Visualização: Split (Terminal + Markdown)"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode("markdown")}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition cursor-pointer ${
                viewMode === "markdown"
                  ? "bg-blue-600 text-white font-medium shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Visualização: Apenas Markdown"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden md:inline">Markdown</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Search Bar */}
      {isSearchOpen && (
        <div className="absolute top-10 right-4 z-30 flex items-center gap-1.5 p-2 rounded-xl bg-[#171a24]/95 border border-[#2d3244] shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-400 ml-1" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) handleSearchPrev();
                else handleSearchNext();
              }
            }}
            placeholder="Procurar no terminal..."
            className="w-48 px-2 py-1 bg-[#0b0d12] border border-[#2a2f40] rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => setSearchCaseSensitive((v) => !v)}
            className={`px-1.5 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
              searchCaseSensitive ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Diferenciar maiúsculas/minúsculas"
          >
            Aa
          </button>

          <button
            onClick={handleSearchPrev}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Anterior (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSearchNext}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Próximo (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsSearchOpen(false);
              searchAddonRef.current?.clearDecorations();
              termRef.current?.focus();
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer ml-1"
            title="Fechar (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace: Terminal and/or Markdown */}
      <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden">
        {/* Terminal Area */}
        <div
          className={`h-full overflow-hidden p-3.5 transition-all ${
            viewMode === "terminal"
              ? "flex-1 block"
              : viewMode === "split"
              ? "w-[56%] block border-r border-[#242838]"
              : "hidden"
          }`}
          style={{ backgroundColor: activeTheme.background }}
        >
          <div ref={containerRef} className="w-full h-full overflow-hidden" />
        </div>

        {/* Markdown Companion Panel */}
        {(viewMode === "split" || viewMode === "markdown") && (
          <div
            className={`h-full overflow-hidden ${
              viewMode === "markdown" ? "flex-1" : "flex-1"
            }`}
          >
            <MarkdownCompanion
              onSendPrompt={handleSendPromptFromCompanion}
              terminalOutput={outputBuffer}
            />
          </div>
        )}
      </div>

      {/* Process Exit Badge */}
      {hasExited && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181b22]/90 border border-zinc-800 text-xs text-zinc-300 backdrop-blur-xs shadow-lg animate-in fade-in">
          <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            Processo finalizado {exitCode !== undefined && exitCode !== null ? `(código ${exitCode})` : ""}
          </span>
        </div>
      )}
    </div>
  );
};
