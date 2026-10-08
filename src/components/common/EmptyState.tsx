import React from "react";
import { Plus, Terminal, Play, Cpu, Check, AlertCircle, Command } from "lucide-react";
import type { CodexDetectionResult, ProfileSummary } from "../../types";

interface EmptyStateProps {
  hasProfiles: boolean;
  profiles: ProfileSummary[];
  detection: CodexDetectionResult | null;
  onNewProfile: () => void;
  onOpenSession: (profileId: string) => void;
  onOpenPalette: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasProfiles,
  profiles,
  detection,
  onNewProfile,
  onOpenSession,
  onOpenPalette,
}) => {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[#0e1015] text-zinc-300 select-none">
      <div className="w-full max-w-lg space-y-6 text-center">
        {/* Brand / Logo */}
        <div className="inline-flex p-3 rounded-2xl bg-[#181b22] border border-[#2b2f3c] shadow-xl text-blue-400">
          <Terminal className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            OpenAI Codex Manager
          </h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Gerenciador desktop nativo de múltiplos perfis e contas para o Codex CLI oficial no Fedora Linux.
          </p>
        </div>

        {/* CLI Status Banner */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14161d] border border-[#262a36]">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400 font-mono text-[11px]">
              {detection?.found ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3 h-3" /> {detection.version || "Codex CLI Ativo"}
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" /> Codex CLI não detectado
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onNewProfile}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Perfil Codex
          </button>

          {hasProfiles && (
            <button
              onClick={() => onOpenSession(profiles[0].profile.id)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center justify-center gap-2 border border-zinc-700"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Iniciar {profiles[0].profile.name}
            </button>
          )}
        </div>

        {/* Available profiles quick grid if any */}
        {hasProfiles && (
          <div className="pt-4 border-t border-[#222530]">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Perfis Disponíveis
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              {profiles.slice(0, 4).map((p) => (
                <button
                  key={p.profile.id}
                  onClick={() => onOpenSession(p.profile.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#14161d] border border-[#262a36] hover:border-zinc-700 hover:bg-zinc-800/40 transition group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.profile.color }}
                    />
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {p.profile.name}
                    </span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="pt-4 flex items-center justify-center gap-6 text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300" onClick={onOpenPalette}>
            <Command className="w-3 h-3" />
            <span>Ctrl+Shift+P</span>
            <span className="text-zinc-600">Comandos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.2 bg-zinc-800 rounded border border-zinc-700">Ctrl+Shift+N</span>
            <span className="text-zinc-600">Novo Perfil</span>
          </div>
        </div>
      </div>
    </div>
  );
};
