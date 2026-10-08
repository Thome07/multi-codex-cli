import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TabBar } from "./components/layout/TabBar";
import { TerminalView } from "./components/terminal/TerminalView";
import { EmptyState } from "./components/common/EmptyState";
import { ProfileModal } from "./components/profiles/ProfileModal";
import { DeleteProfileModal } from "./components/profiles/DeleteProfileModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { CommandPalette } from "./components/palette/CommandPalette";
import { api } from "./services/api";
import type {
  AppSettings,
  CodexDetectionResult,
  CreateProfileRequest,
  Profile,
  ProfileSummary,
  SessionInfo,
  UpdateProfileRequest,
} from "./types";

export function App() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    terminalFontFamily: "JetBrains Mono, monospace",
    terminalFontSize: 13,
    terminalLineHeight: 1.25,
    terminalCursorStyle: "block",
    terminalCursorBlink: true,
    terminalScrollback: 5000,
    theme: "dark",
    confirmCloseSession: true,
    warnDuplicateWorkingDir: true,
  });
  const [detection, setDetection] = useState<CodexDetectionResult | null>(null);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Initial data loading
  const refreshProfiles = useCallback(async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
      if (data.length > 0 && !activeProfileId) {
        setActiveProfileId(data[0].profile.id);
      }
    } catch (e) {
      console.error("Erro ao carregar perfis:", e);
    }
  }, [activeProfileId]);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      console.error("Erro ao carregar configurações:", e);
    }
  }, []);

  const refreshDetection = useCallback(async () => {
    try {
      const d = await api.detectCodex();
      setDetection(d);
    } catch (e) {
      console.error("Erro ao detectar Codex CLI:", e);
    }
  }, []);

  useEffect(() => {
    refreshProfiles();
    refreshSettings();
    refreshDetection();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+N: New Profile
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingProfile(null);
        setIsProfileModalOpen(true);
      }
      // Ctrl+Shift+P: Command Palette
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      // Ctrl+,: Settings
      else if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
      // Ctrl+W: Close current tab
      else if (e.ctrlKey && e.key.toLowerCase() === "w" && !e.shiftKey) {
        if (activeSessionId) {
          e.preventDefault();
          handleCloseSession(activeSessionId);
        }
      }
      // Ctrl+N: New session for active profile
      else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        if (activeProfileId) {
          e.preventDefault();
          handleSpawnSession(activeProfileId);
        }
      }
      // Ctrl+Tab: Next tab
      else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (sessions.length > 1 && activeSessionId) {
          const idx = sessions.findIndex((s) => s.id === activeSessionId);
          const nextIdx = e.shiftKey
            ? (idx - 1 + sessions.length) % sessions.length
            : (idx + 1) % sessions.length;
          setActiveSessionId(sessions[nextIdx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProfileId, activeSessionId, sessions]);

  // Spawn a new interactive Codex session
  const handleSpawnSession = async (profileId: string, customArgs?: string[], isLoginSession = false) => {
    try {
      const session = await api.spawnSession({
        profileId,
        cols: 80,
        rows: 24,
        customArgs,
        isLoginSession,
      });

      setSessions((prev) => [...prev, session]);
      setActiveSessionId(session.id);
      setActiveProfileId(profileId);
      refreshProfiles();
    } catch (e: any) {
      alert(`Falha ao iniciar sessão do Codex: ${e}`);
    }
  };

  // Close an active session
  const handleCloseSession = async (sessionId: string) => {
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) return;

    if (settings.confirmCloseSession && s.isAlive) {
      const ok = confirm(`Deseja realmente encerrar a sessão "${s.title}"?`);
      if (!ok) return;
    }

    try {
      await api.killSession(sessionId);
    } catch (e) {
      console.error("Erro ao finalizar sessão:", e);
    }

    setSessions((prev) => {
      const remaining = prev.filter((x) => x.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });

    refreshProfiles();
  };

  // Profile lifecycle handlers
  const handleProfileSubmit = async (data: CreateProfileRequest | UpdateProfileRequest) => {
    if ("id" in data) {
      await api.updateProfile(data as UpdateProfileRequest);
    } else {
      const newP = await api.createProfile(data as CreateProfileRequest);
      setActiveProfileId(newP.id);
    }
    await refreshProfiles();
  };

  const handleDeleteProfileConfirm = async (profileId: string, deleteData: boolean) => {
    await api.deleteProfile(profileId, deleteData);
    setSessions((prev) => prev.filter((s) => s.profileId !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfileId(null);
    }
    await refreshProfiles();
  };

  const handleDuplicateProfile = async (profileId: string) => {
    try {
      const duplicated = await api.duplicateProfile(profileId);
      setActiveProfileId(duplicated.id);
      await refreshProfiles();
    } catch (e: any) {
      alert(`Falha ao duplicar perfil: ${e}`);
    }
  };

  // Connect profile via interactive login
  const handleConnectProfile = async (profileId: string) => {
    // Spawns interactive `codex login` in integrated PTY session!
    await handleSpawnSession(profileId, ["login"], true);
  };

  // Disconnect profile via official logout
  const handleDisconnectProfile = async (profileId: string) => {
    const ok = confirm("Deseja desconectar a conta deste perfil? As credenciais serão removidas.");
    if (!ok) return;

    try {
      await api.logoutProfile(profileId);
      await refreshProfiles();
    } catch (e: any) {
      alert(`Falha ao desconectar perfil: ${e}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e1015] text-zinc-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        detection={detection}
        onNewProfile={() => {
          setEditingProfile(null);
          setIsProfileModalOpen(true);
        }}
        onSelectProfile={(id) => setActiveProfileId(id)}
        onOpenSession={(id) => handleSpawnSession(id)}
        onConnectProfile={handleConnectProfile}
        onDisconnectProfile={handleDisconnectProfile}
        onEditProfile={(p) => {
          setEditingProfile(p);
          setIsProfileModalOpen(true);
        }}
        onDuplicateProfile={handleDuplicateProfile}
        onDeleteProfile={(p) => setDeletingProfile(p)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
      />

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0e1015]">
        {/* Tab Bar when sessions exist */}
        <TabBar
          sessions={sessions}
          activeSessionId={activeSessionId}
          profiles={profiles}
          onSelectTab={(id) => setActiveSessionId(id)}
          onCloseTab={handleCloseSession}
          onNewSessionForProfile={(profileId) => handleSpawnSession(profileId)}
          onDisconnectProfile={handleDisconnectProfile}
          warnDuplicateCwd={settings.warnDuplicateWorkingDir}
        />

        {/* Workspace: Either Terminal Views or Empty State */}
        <div className="flex-1 relative overflow-hidden bg-[#0e1015]">
          {sessions.length === 0 ? (
            <EmptyState
              hasProfiles={profiles.length > 0}
              profiles={profiles}
              detection={detection}
              onNewProfile={() => {
                setEditingProfile(null);
                setIsProfileModalOpen(true);
              }}
              onOpenSession={(id) => handleSpawnSession(id)}
              onOpenPalette={() => setIsPaletteOpen(true)}
            />
          ) : (
            sessions.map((session) => (
              <TerminalView
                key={session.id}
                session={session}
                settings={settings}
                isActive={session.id === activeSessionId}
                onSessionExit={() => refreshProfiles()}
              />
            ))
          )}
        </div>
      </main>

      {/* Modals & Dialogs */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSubmit={handleProfileSubmit}
        editingProfile={editingProfile}
      />

      <DeleteProfileModal
        isOpen={!!deletingProfile}
        profile={deletingProfile}
        onClose={() => setDeletingProfile(null)}
        onConfirm={handleDeleteProfileConfirm}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        detection={detection}
        onClose={() => setIsSettingsOpen(false)}
        onSave={async (s) => {
          await api.updateSettings(s);
          setSettings(s);
        }}
        onRefreshDetection={refreshDetection}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        profiles={profiles}
        activeSessions={sessions}
        activeSessionId={activeSessionId}
        onNewProfile={() => {
          setEditingProfile(null);
          setIsProfileModalOpen(true);
        }}
        onOpenSession={(id) => handleSpawnSession(id)}
        onConnectProfile={handleConnectProfile}
        onDisconnectProfile={handleDisconnectProfile}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCloseActiveSession={() => {
          if (activeSessionId) handleCloseSession(activeSessionId);
        }}
        onSelectSession={(id) => setActiveSessionId(id)}
      />
    </div>
  );
}

export default App;
