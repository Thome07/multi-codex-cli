import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, LogIn, LogOut, Sliders, X, ArrowRight } from "lucide-react";
import type { ProfileSummary, SessionInfo } from "../../types";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ProfileSummary[];
  activeSessions: SessionInfo[];
  activeSessionId: string | null;
  onNewProfile: () => void;
  onOpenSession: (profileId: string) => void;
  onConnectProfile: (profileId: string) => void;
  onDisconnectProfile: (profileId: string) => void;
  onOpenSettings: () => void;
  onCloseActiveSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  profiles,
  activeSessions,
  activeSessionId,
  onNewProfile,
  onOpenSession,
  onConnectProfile,
  onDisconnectProfile,
  onOpenSettings,
  onCloseActiveSession,
  onSelectSession,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      id: "new-profile",
      title: "Novo Perfil Codex...",
      subtitle: "Criar um novo ambiente de conta isolado",
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      category: "Ações Globais",
      badge: "Ctrl+Shift+N",
      action: () => {
        onClose();
        onNewProfile();
      },
    },
    {
      id: "settings",
      title: "Abrir Configurações...",
      subtitle: "Preferências de terminal, temas e atalhos",
      icon: <Sliders className="w-4 h-4 text-blue-400" />,
      category: "Ações Globais",
      badge: "Ctrl+,",
      action: () => {
        onClose();
        onOpenSettings();
      },
    },
    ...(activeSessionId
      ? [
          {
            id: "close-session",
            title: "Fechar Sessão Ativa",
            subtitle: "Encerrar a aba de terminal em foco",
            icon: <X className="w-4 h-4 text-red-400" />,
            category: "Sessão Atual",
            badge: "Ctrl+W",
            action: () => {
              onClose();
              onCloseActiveSession();
            },
          },
        ]
      : []),
    ...activeSessions.map((s) => ({
      id: `switch-session-${s.id}`,
      title: `Alternar para: ${s.title}`,
      subtitle: s.cwd,
      icon: (
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: s.profileColor }}
        />
      ),
      category: "Sessões Abertas",
      badge: s.id === activeSessionId ? "Ativa" : undefined,
      action: () => {
        onClose();
        onSelectSession(s.id);
      },
    })),
    ...profiles.map((p) => ({
      id: `spawn-${p.profile.id}`,
      title: `Iniciar Terminal: ${p.profile.name}`,
      subtitle: p.profile.description || `CODEX_HOME isolado`,
      icon: (
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: p.profile.color }}
        />
      ),
      category: "Iniciar Codex",
      badge: p.authStatus.status === "logged_in" ? "Conectado" : "Desconectado",
      action: () => {
        onClose();
        onOpenSession(p.profile.id);
      },
    })),
    ...profiles.map((p) => ({
      id: `login-${p.profile.id}`,
      title: `Autenticar Conta: ${p.profile.name}`,
      subtitle: `Executar codex login para este perfil`,
      icon: <LogIn className="w-4 h-4 text-blue-400" />,
      category: "Autenticação",
      action: () => {
        onClose();
        onConnectProfile(p.profile.id);
      },
    })),
    ...profiles
      .filter((p) => p.authStatus.status === "logged_in")
      .map((p) => ({
        id: `logout-${p.profile.id}`,
        title: `Desconectar Conta: ${p.profile.name}`,
        subtitle: `Executar codex logout para este perfil`,
        icon: <LogOut className="w-4 h-4 text-amber-400" />,
        category: "Autenticação",
        action: () => {
          onClose();
          onDisconnectProfile(p.profile.id);
        },
      })),
  ];

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#14161d] border border-[#2d3240] rounded-xl shadow-2xl overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#242834] bg-[#111319]">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando, perfil ou ação... (ex: novo, codex, sessao)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Nenhum comando correspondente encontrado
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
                  i === selectedIndex
                    ? "bg-blue-600/20 text-white border border-blue-500/40"
                    : "text-zinc-300 hover:bg-zinc-800/40 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">{cmd.icon}</div>
                  <div className="truncate">
                    <div className="text-xs font-medium truncate flex items-center gap-2">
                      {cmd.title}
                      <span className="text-[10px] text-zinc-500 font-normal">
                        • {cmd.category}
                      </span>
                    </div>
                    {cmd.subtitle && (
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                        {cmd.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cmd.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 border border-zinc-700/80 text-zinc-400 font-mono">
                      {cmd.badge}
                    </span>
                  )}
                  {i === selectedIndex && (
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-[#242834] bg-[#0f1116] text-[11px] text-zinc-500">
          <span>Use ↑ ↓ para navegar, Enter para selecionar</span>
          <span className="font-mono">Command Palette</span>
        </div>
      </div>
    </div>
  );
};
