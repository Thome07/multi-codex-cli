import React, { useState } from "react";
import { X, Sliders, Terminal, Cpu, Check, AlertCircle, RefreshCw } from "lucide-react";
import type { AppSettings, CodexDetectionResult } from "../../types";
import { api } from "../../services/api";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  detection: CodexDetectionResult | null;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
  onRefreshDetection: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  detection,
  onClose,
  onSave,
  onRefreshDetection,
}) => {
  const [activeTab, setActiveTab] = useState<"terminal" | "codex" | "general">("terminal");
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<CodexDetectionResult | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCodex = async () => {
    setIsTesting(true);
    try {
      const res = await api.detectCodex(localSettings.codexPath || undefined);
      setTestResult(res);
      await onRefreshDetection();
    } catch (e: any) {
      setTestResult({
        found: false,
        isOfficial: false,
        error: e.toString(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#16181f] border border-[#2b2f3c] rounded-xl shadow-2xl overflow-hidden text-zinc-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242834] bg-[#12141a]">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Configurações do Codex Manager
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Sidebar */}
        <div className="flex flex-1 min-h-[420px] overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-48 border-r border-[#242834] bg-[#111318] p-3 space-y-1">
            <button
              onClick={() => setActiveTab("terminal")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "terminal"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Terminal
            </button>
            <button
              onClick={() => setActiveTab("codex")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "codex"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Cpu className="w-4 h-4" />
              OpenAI Codex
            </button>
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "general"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Geral & Sessões
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#16181f]">
            {activeTab === "terminal" && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Aparência do Terminal
                </h3>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Família da Fonte
                  </label>
                  <input
                    type="text"
                    value={localSettings.terminalFontFamily}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, terminalFontFamily: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Tamanho da Fonte (px)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={28}
                      value={localSettings.terminalFontSize}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          terminalFontSize: parseInt(e.target.value) || 13,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Espaçamento de Linha
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      min={1}
                      max={2}
                      value={localSettings.terminalLineHeight}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          terminalLineHeight: parseFloat(e.target.value) || 1.25,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Estilo do Cursor
                    </label>
                    <select
                      value={localSettings.terminalCursorStyle}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          terminalCursorStyle: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="block">Bloco (Block)</option>
                      <option value="underline">Sublinhado (Underline)</option>
                      <option value="bar">Barra Vertical (Bar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Linhas de Histórico (Scrollback)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={50000}
                      step={1000}
                      value={localSettings.terminalScrollback}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          terminalScrollback: parseInt(e.target.value) || 5000,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={localSettings.terminalCursorBlink}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          terminalCursorBlink: e.target.checked,
                        })
                      }
                      className="rounded-sm border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <span>Piscar cursor interativo</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "codex" && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Detecção & Executável do Codex
                </h3>

                {/* Status Box */}
                <div className="p-3.5 rounded-lg bg-[#0e1015] border border-[#262a36] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Status de Instalação:</span>
                    {(testResult || detection)?.found ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Oficial Detectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" /> Não Encontrado
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-400 font-mono text-[11px] break-all">
                    Caminho: {(testResult || detection)?.path || "Nenhum executável detectado"}
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    Versão: {(testResult || detection)?.version || "Desconhecida"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Caminho Personalizado do Executável (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ex: /usr/local/bin/codex ou deixe vazio para auto-detecção"
                      value={localSettings.codexPath || ""}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          codexPath: e.target.value.trim() || null,
                        })
                      }
                      className="flex-1 px-3 py-2 text-xs font-mono bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestCodex}
                      disabled={isTesting}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                      Testar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Diretório Global Padrão para Sessões (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: /home/igor/projetos"
                    value={localSettings.defaultWorkingDir || ""}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        defaultWorkingDir: e.target.value.trim() || null,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#0e1015] border border-[#262a36] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {activeTab === "general" && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Preferências Gerais
                </h3>

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={localSettings.confirmCloseSession}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          confirmCloseSession: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded-sm border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-medium text-zinc-200 block">
                        Confirmar antes de fechar abas ativas
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        Evita o encerramento acidental de sessões com o Codex executando tarefas.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={localSettings.warnDuplicateWorkingDir}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          warnDuplicateWorkingDir: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded-sm border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-medium text-zinc-200 block">
                        Avisar sobre múltiplas sessões na mesma pasta
                      </span>
                      <span className="text-zinc-500 text-[11px]">
                        Alerta quando dois agentes forem executados no mesmo repositório para prevenir conflitos de escrita.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#242834] bg-[#12141a]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
          >
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </div>
  );
};
