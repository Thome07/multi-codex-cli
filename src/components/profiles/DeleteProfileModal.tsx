import React, { useState } from "react";
import { AlertTriangle, Trash2, X, ShieldAlert } from "lucide-react";
import type { Profile } from "../../types";

interface DeleteProfileModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onClose: () => void;
  onConfirm: (profileId: string, deleteData: boolean) => Promise<void>;
}

export const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onConfirm,
}) => {
  const [deleteData, setDeleteData] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !profile) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(profile.id, deleteData);
      onClose();
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Erro ao remover perfil");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#16181f] border border-[#2e3240] rounded-xl shadow-2xl overflow-hidden text-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242834] bg-[#12141a]">
          <h2 className="text-sm font-semibold tracking-wide text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Remover Perfil Codex
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 border border-red-800/60 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <p className="text-xs text-zinc-300 leading-relaxed">
            Você está prestes a remover o perfil <strong className="text-white font-semibold">{profile.name}</strong>.
            Sessões ativas deste perfil serão finalizadas imediatamente.
          </p>

          <div className="space-y-2 pt-1">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                deleteData
                  ? "border-red-900/60 bg-red-950/20 text-zinc-200"
                  : "border-[#262a36] bg-[#0e1015] text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="deleteOption"
                checked={deleteData}
                onChange={() => setDeleteData(true)}
                className="mt-0.5 text-red-600 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-100 block mb-0.5">
                  Remover perfil e apagar dados locais (Recomendado)
                </span>
                <span className="text-zinc-400">
                  Exclui os metadados do gerenciador e o diretório de configurações isoladas (`CODEX_HOME`).
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                !deleteData
                  ? "border-blue-900/60 bg-blue-950/20 text-zinc-200"
                  : "border-[#262a36] bg-[#0e1015] text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="deleteOption"
                checked={!deleteData}
                onChange={() => setDeleteData(false)}
                className="mt-0.5 text-blue-600 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-100 block mb-0.5">
                  Remover do gerenciador, mantendo dados em disco
                </span>
                <span className="text-zinc-400">
                  Remove o perfil da interface, mas mantém o diretório salvo para eventual recuperação.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Garantia de Segurança:</strong> Seus projetos e repositórios de código nunca serão apagados ou modificados.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242834]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? "Removendo..." : "Confirmar Exclusão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
