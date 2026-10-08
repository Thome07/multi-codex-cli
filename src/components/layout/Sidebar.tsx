import React, { useState } from "react";
import {
  Plus,
  Play,
  LogIn,
  LogOut,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  Sliders,
  Command,
  Cpu,
  Search,
  Terminal,
} from "lucide-react";
import type { CodexDetectionResult, Profile, ProfileSummary } from "../../types";
import { StatusBadge } from "../common/StatusBadge";

interface SidebarProps {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  detection: CodexDetectionResult | null;
  onNewProfile: () => void;
  onSelectProfile: (profileId: string) => void;
  onOpenSession: (profileId: string) => void;
  onConnectProfile: (profileId: string) => void;
  onDisconnectProfile: (profileId: string) => void;
  onEditProfile: (profile: Profile) => void;
  onDuplicateProfile: (profileId: string) => void;
  onDeleteProfile: (profile: Profile) => void;
  onOpenSettings: () => void;
  onOpenPalette: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  profiles,
  activeProfileId,
  detection,
  onNewProfile,
  onSelectProfile,
  onOpenSession,
  onConnectProfile,
  onDisconnectProfile,
  onEditProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onOpenSettings,
  onOpenPalette,
}) => {
  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filtered = profiles.filter((p) =>
    p.profile.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.profile.description && p.profile.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <aside className="w-64 h-full flex flex-col bg-[#12141a] border-r border-[#242834] select-none text-zinc-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#202430]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-zinc-100 flex items-center gap-1.5">
              CODEX MANAGER
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">Fedora Linux</div>
          </div>
        </div>

        <button
          onClick={onOpenPalette}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Command className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Button: + Novo Codex */}
      <div className="p-3 pb-2 space-y-2">
        <button
          onClick={onNewProfile}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Codex</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar perfis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#0e1015] border border-[#242834] rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Profiles List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
          <span>Perfis ({profiles.length})</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            {search ? "Nenhum perfil encontrado" : "Nenhum perfil cadastrado"}
          </div>
        ) : (
          filtered.map((item) => {
            const p = item.profile;
            const isMenuOpen = activeMenuId === p.id;
            const isSelected = activeProfileId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`group relative flex flex-col p-2.5 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#181b24] border-[#313645] shadow-xs"
                    : "bg-[#14161e] border-transparent hover:bg-[#161922] hover:border-[#262a36]"
                }`}
              >
                {/* Profile Top Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {p.name}
                    </span>
                  </div>

                  {/* Active Sessions Count Badge */}
                  {item.activeSessionsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                      {item.activeSessionsCount}
                    </span>
                  )}
                </div>

                {/* Profile Bottom Row: Auth status & actions */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#1e222d]">
                  <StatusBadge status={item.authStatus} compact />

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSession(p.id);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition"
                      title="Iniciar Terminal"
                    >
                      <Play className="w-3 h-3" />
                    </button>

                    {item.authStatus.status !== "logged_in" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnectProfile(p.id);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition"
                        title="Conectar Conta"
                      >
                        <LogIn className="w-3 h-3" />
                      </button>
                    )}

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : p.id);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                        title="Mais opções"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 bg-[#1a1d27] border border-[#2e3342] rounded-lg shadow-xl z-50 p-1 space-y-0.5 text-xs animate-in fade-in"
                          onClick={(e) => e.stopPropagation()}
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onOpenSession(p.id);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Iniciar Terminal</span>
                          </button>

                          {item.authStatus.status === "logged_in" ? (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDisconnectProfile(p.id);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 transition"
                            >
                              <LogOut className="w-3.5 h-3.5 text-amber-400" />
                              <span>Desconectar Conta</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onConnectProfile(p.id);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-blue-400 transition"
                            >
                              <LogIn className="w-3.5 h-3.5 text-blue-400" />
                              <span>Conectar Conta</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDuplicateProfile(p.id);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                          >
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Duplicar Perfil</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditProfile(p);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Editar / Renomear</span>
                          </button>

                          <div className="my-1 border-t border-[#272b38]" />

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteProfile(p);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-red-400 hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir Perfil...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#202430] bg-[#101217] text-xs space-y-2">
        <div className="flex items-center justify-between text-zinc-500 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 truncate">
            <Cpu className="w-3 h-3 text-zinc-400" />
            <span className="truncate">
              {detection?.version ? detection.version.replace("codex-cli", "").trim() : "Codex CLI"}
            </span>
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="CLI detectado" />
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161820] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-[#252936] transition"
        >
          <span className="flex items-center gap-2 text-xs">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Configurações
          </span>
          <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+,</kbd>
        </button>
      </div>
    </aside>
  );
};
