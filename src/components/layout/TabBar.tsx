import React, { useState } from "react";
import { X, Plus, Folder, AlertTriangle, LogOut, Terminal } from "lucide-react";
import type { SessionInfo, ProfileSummary } from "../../types";

interface TabBarProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  profiles: ProfileSummary[];
  onSelectTab: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
  onNewSessionForProfile: (profileId: string) => void;
  onDisconnectProfile: (profileId: string) => void;
  warnDuplicateCwd: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  sessions,
  activeSessionId,
  profiles,
  onSelectTab,
  onCloseTab,
  onNewSessionForProfile,
  onDisconnectProfile,
  warnDuplicateCwd,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Check if multiple active sessions share the same working directory
  const isDuplicateCwd =
    activeSession &&
    warnDuplicateCwd &&
    sessions.filter((s) => s.cwd === activeSession.cwd).length > 1;

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col border-b border-[#242834] bg-[#12141a] select-none">
      {/* Tabs Row */}
      <div className="flex items-center justify-between px-2 pt-1 border-b border-[#1f232c] overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const cwdBasename = s.cwd.split("/").filter(Boolean).pop() || "~";

            return (
              <div
                key={s.id}
                onClick={() => onSelectTab(s.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t border-x text-xs font-medium cursor-pointer transition min-w-[140px] max-w-[220px] ${
                  isActive
                    ? "bg-[#0e1015] border-[#2b2f3c] border-b-transparent text-zinc-100 shadow-xs"
                    : "border-transparent bg-[#14161e] text-zinc-400 hover:text-zinc-200 hover:bg-[#181a24]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.profileColor }}
                />

                <span className="truncate flex-1 font-mono text-[11px]">
                  {s.profileName}
                  <span className="text-zinc-500 font-normal ml-1.5 text-[10px]">
                    {cwdBasename}
                  </span>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(s.id);
                  }}
                  className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                  title="Fechar sessão"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* New Tab Button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              title="Nova sessão"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {showAddMenu && (
              <div
                className="absolute left-0 top-full mt-1 w-48 bg-[#181b24] border border-[#2b2f3c] rounded-lg shadow-xl z-50 p-1 space-y-0.5 text-xs animate-in fade-in"
                onMouseLeave={() => setShowAddMenu(false)}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase">
                  Novo Terminal
                </div>
                {profiles.map((p) => (
                  <button
                    key={p.profile.id}
                    onClick={() => {
                      setShowAddMenu(false);
                      onNewSessionForProfile(p.profile.id);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.profile.color }}
                    />
                    <span className="truncate">{p.profile.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Session Info Bar */}
      {activeSession && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#0e1015] text-[11px] text-zinc-400">
          <div className="flex items-center gap-3 truncate">
            {/* Working Directory */}
            <div className="flex items-center gap-1.5 truncate font-mono text-zinc-300">
              <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate" title={activeSession.cwd}>
                {activeSession.cwd}
              </span>
            </div>

            {/* Duplicate Working Directory Warning */}
            {isDuplicateCwd && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/50 text-[10px]">
                <AlertTriangle className="w-3 h-3" />
                Múltiplas instâncias neste diretório
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNewSessionForProfile(activeSession.profileId)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              title="Abrir outra sessão para este mesmo perfil"
            >
              <Terminal className="w-3 h-3" />
              <span>Nova Aba</span>
            </button>

            <button
              onClick={() => onDisconnectProfile(activeSession.profileId)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition"
              title="Desconectar conta ChatGPT deste perfil"
            >
              <LogOut className="w-3 h-3" />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
