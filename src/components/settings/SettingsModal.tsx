import React, { useState } from "react";
import {
  X,
  Sliders,
  Terminal,
  Cpu,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowUpCircle,
  Key,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { AppSettings, CodexDetectionResult, CodexUpdateResult } from "../../types";
import { api } from "../../services/api";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  detection: CodexDetectionResult | null;
  initialTab?: "terminal" | "codex" | "general";
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
  onRefreshDetection: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  detection,
  initialTab = "terminal",
  onClose,
  onSave,
  onRefreshDetection,
}) => {
  const [activeTab, setActiveTab] = useState<"terminal" | "codex" | "general">(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<CodexDetectionResult | null>(null);
  const [sudoPassword, setSudoPassword] = useState("golg3200");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<CodexUpdateResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const handleUpdateCodex = async () => {
    setIsUpdating(true);
    setUpdateResult(null);
    setUpdateError(null);
    try {
      const res = await api.updateCodexCli(sudoPassword);
      if (res.success) {
        setUpdateResult(res);
        await onRefreshDetection();
        const detected = await api.detectCodex(localSettings.codexPath || undefined);
        setTestResult(detected);
      } else {
        setUpdateError(res.message);
      }
    } catch (e: any) {
      setUpdateError(e.toString());
    } finally {
      setIsUpdating(false);
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
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Executável & Atualização do Codex
                  </h3>
                  <button
                    type="button"
                    onClick={handleTestCodex}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-zinc-300 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`} />
                    Verificar Novamente
                  </button>
                </div>

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
                    Executável Ativo: <span className="text-zinc-200">{(testResult || detection)?.path || "Nenhum detectado"}</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    Versão Atual: <span className="text-emerald-400 font-semibold font-mono">{(testResult || detection)?.version || "Desconhecida"}</span>
                  </div>
                </div>

                {/* Multiple Candidates on System (if any) */}
                {((testResult || detection)?.allCandidates && (testResult || detection)!.allCandidates!.length > 1) && (
                  <div className="p-3 rounded-lg bg-[#11131a] border border-[#232734] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Instalações Detectadas no Sistema ({((testResult || detection)?.allCandidates || []).length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {(testResult || detection)!.allCandidates!.map((c, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-mono border ${
                            c.isActive
                              ? "bg-blue-950/20 border-blue-800/40 text-blue-200"
                              : "bg-[#0b0d12] border-zinc-800/60 text-zinc-400"
                          }`}
                        >
                          <span className="truncate pr-2">{c.path}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-zinc-400">{c.version || "desconhecido"}</span>
                            {c.isActive && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px] uppercase font-semibold">
                                Ativo (Mais Recente)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      O Codex Manager seleciona automaticamente a versão mais recente encontrada no sistema operacional.
                    </p>
                  </div>
                )}

                {/* Update Section */}
                <div className="p-4 rounded-xl bg-gradient-to-b from-[#141824] to-[#0f1118] border border-blue-900/30 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Atualizador Oficial do Codex CLI
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">npm @openai/codex@latest</span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Executa a atualização global no Fedora (<code className="text-zinc-300">sudo npm install -g @openai/codex@latest</code>) e sincroniza a pasta do usuário para manter todas as sessões e terminais 100% atualizados.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-zinc-500" />
                        Senha do Sudo (Fedora):
                      </label>
                      <input
                        type="password"
                        value={sudoPassword}
                        onChange={(e) => setSudoPassword(e.target.value)}
                        placeholder="Senha sudo"
                        className="w-full px-3 py-1.5 text-xs font-mono bg-[#0b0d12] border border-[#2b3040] rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleUpdateCodex}
                        disabled={isUpdating}
                        className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-xs font-medium text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
                        <span>{isUpdating ? "Atualizando..." : "Atualizar Codex"}</span>
                      </button>
                    </div>
                  </div>

                  {updateResult && (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">{updateResult.message}</div>
                        <div className="text-[11px] text-emerald-400/80">
                          {updateResult.oldVersion && `Anterior: ${updateResult.oldVersion} → `}
                          {updateResult.newVersion && `Nova: ${updateResult.newVersion}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {updateError && (
                    <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="break-all">{updateError}</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Caminho Personalizado do Executável (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ex: /usr/local/bin/codex ou deixe vazio para auto-detecção da versão mais recente"
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
