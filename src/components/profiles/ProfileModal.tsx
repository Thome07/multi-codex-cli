import React, { useState, useEffect } from "react";
import { X, Folder, Palette } from "lucide-react";
import type { CreateProfileRequest, Profile, UpdateProfileRequest } from "../../types";

const COLOR_PALETTE = [
  { name: "Esmeralda", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Violeta", value: "#8b5cf6" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Laranja", value: "#f97316" },
  { name: "Índigo", value: "#6366f1" },
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProfileRequest | UpdateProfileRequest) => Promise<void>;
  editingProfile?: Profile | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingProfile,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [defaultProjectDir, setDefaultProjectDir] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingProfile) {
      setName(editingProfile.name);
      setDescription(editingProfile.description || "");
      setColor(editingProfile.color || COLOR_PALETTE[0].value);
      setDefaultProjectDir(editingProfile.defaultProjectDir || "");
    } else {
      setName("");
      setDescription("");
      setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].value);
      setDefaultProjectDir("");
    }
    setError(null);
  }, [editingProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do perfil é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingProfile) {
        await onSubmit({
          id: editingProfile.id,
          name: name.trim(),
          description: description.trim() || null,
          color,
          defaultProjectDir: defaultProjectDir.trim() || null,
        } as UpdateProfileRequest);
      } else {
        await onSubmit({
          name: name.trim(),
          description: description.trim() || null,
          color,
          defaultProjectDir: defaultProjectDir.trim() || null,
        } as CreateProfileRequest);
      }
      onClose();
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Erro ao salvar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#16181f] border border-[#2b2f3c] rounded-xl shadow-2xl overflow-hidden text-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242834] bg-[#12141a]">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {editingProfile ? "Editar Perfil Codex" : "Novo Perfil Codex"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-950/40 border border-red-800/60 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nome do Perfil <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ex: Conta Pessoal, Dev / Empresa, Testes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Descrição (opcional)
            </label>
            <input
              type="text"
              placeholder="ex: Usado para projetos open-source"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Cor de Identificação
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                    color === c.value
                      ? "border-zinc-200 bg-zinc-800/80 font-medium text-white shadow-xs"
                      : "border-[#262a36] bg-[#0e1015] text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" /> Diretório Padrão de Trabalho (opcional)
            </label>
            <input
              type="text"
              placeholder="ex: /home/igor/projetos/meu-app"
              value={defaultProjectDir}
              onChange={(e) => setDefaultProjectDir(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono text-xs"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Se omitido, o Codex será iniciado na pasta do projeto atual ou home.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#242834]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-2 shadow-xs"
            >
              {isSubmitting ? "Salvando..." : editingProfile ? "Salvar Alterações" : "Criar Perfil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
