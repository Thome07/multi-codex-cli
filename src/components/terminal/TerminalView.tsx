import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { api } from "../../services/api";
import type { AppSettings, SessionInfo } from "../../types";
import { Terminal as TerminalIcon } from "lucide-react";

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
  const [hasExited, setHasExited] = useState(!session.isAlive);
  const [exitCode, setExitCode] = useState<number | null | undefined>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: settings.terminalCursorBlink,
      cursorStyle: (settings.terminalCursorStyle as any) || "block",
      fontSize: settings.terminalFontSize || 13,
      fontFamily: settings.terminalFontFamily || "JetBrains Mono, monospace",
      lineHeight: settings.terminalLineHeight || 1.25,
      scrollback: settings.terminalScrollback || 5000,
      theme: {
        background: "#0e1015",
        foreground: "#f3f4f6",
        cursor: "#3b82f6",
        cursorAccent: "#0e1015",
        selectionBackground: "rgba(59, 130, 246, 0.35)",
        black: "#181b22",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#ec4899",
        cyan: "#06b6d4",
        white: "#e5e7eb",
        brightBlack: "#4b5563",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#f472b6",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowTransparency: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit and resize report to Rust PTY backend
    setTimeout(() => {
      try {
        fitAddon.fit();
        api.resizeSession(session.id, term.cols, term.rows);
      } catch (e) {
        console.error("Initial fit failed:", e);
      }
    }, 50);

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

  // When tab becomes active, refocus and fit terminal
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
  }, [isActive]);

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#0e1015] ${
        isActive ? "block" : "hidden"
      }`}
    >
      <div ref={containerRef} className="flex-1 w-full h-full overflow-hidden" />

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
