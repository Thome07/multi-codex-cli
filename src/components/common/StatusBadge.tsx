import React from "react";
import type { AuthStatus } from "../../types";

interface StatusBadgeProps {
  status: AuthStatus;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, compact = false }) => {
  switch (status.status) {
    case "logged_in":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {!compact && (status.detail ? `${status.detail}` : "Conectado")}
        </span>
      );

    case "authenticating":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-950/60 text-blue-400 border border-blue-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          {!compact && "Autenticando..."}
        </span>
      );

    case "not_logged_in":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800/70 text-zinc-400 border border-zinc-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          {!compact && "Desconectado"}
        </span>
      );

    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {!compact && "Erro"}
        </span>
      );

    case "unknown":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          {!compact && "Verificando..."}
        </span>
      );
  }
};
