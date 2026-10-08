import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppSettings,
  AuthStatus,
  CodexDetectionResult,
  CreateProfileRequest,
  Profile,
  ProfileSummary,
  PtyExitPayload,
  PtyOutputPayload,
  SessionInfo,
  UpdateProfileRequest,
} from "../types";

export const api = {
  // Detection
  detectCodex: async (overridePath?: string): Promise<CodexDetectionResult> => {
    return await invoke<CodexDetectionResult>("detect_codex", {
      stateSettings: overridePath || null,
    });
  },

  // Profiles
  getProfiles: async (): Promise<ProfileSummary[]> => {
    return await invoke<ProfileSummary[]>("get_profiles");
  },

  getProfile: async (id: string): Promise<Profile> => {
    return await invoke<Profile>("get_profile", { id });
  },

  createProfile: async (req: CreateProfileRequest): Promise<Profile> => {
    return await invoke<Profile>("create_profile", { req });
  },

  updateProfile: async (req: UpdateProfileRequest): Promise<Profile> => {
    return await invoke<Profile>("update_profile", { req });
  },

  deleteProfile: async (id: string, deleteData: boolean): Promise<void> => {
    return await invoke<void>("delete_profile", { id, deleteData });
  },

  duplicateProfile: async (id: string): Promise<Profile> => {
    return await invoke<Profile>("duplicate_profile", { id });
  },

  reorderProfiles: async (ids: string[]): Promise<void> => {
    return await invoke<void>("reorder_profiles", { ids });
  },

  getProfileAuthStatus: async (id: string): Promise<AuthStatus> => {
    return await invoke<AuthStatus>("get_profile_auth_status", { id });
  },

  logoutProfile: async (id: string): Promise<void> => {
    return await invoke<void>("logout_profile", { id });
  },

  // Sessions & PTY
  spawnSession: async (params: {
    profileId: string;
    cwd?: string;
    cols: number;
    rows: number;
    customArgs?: string[];
    isLoginSession?: boolean;
  }): Promise<SessionInfo> => {
    return await invoke<SessionInfo>("spawn_session", {
      profileId: params.profileId,
      cwd: params.cwd || null,
      cols: params.cols,
      rows: params.rows,
      customArgs: params.customArgs || null,
      isLoginSession: params.isLoginSession ?? false,
    });
  },

  writeSession: async (sessionId: string, data: string): Promise<void> => {
    return await invoke<void>("write_session", { sessionId, data });
  },

  resizeSession: async (sessionId: string, cols: number, rows: number): Promise<void> => {
    return await invoke<void>("resize_session", { sessionId, cols, rows });
  },

  killSession: async (sessionId: string): Promise<void> => {
    return await invoke<void>("kill_session", { sessionId });
  },

  listActiveSessions: async (): Promise<SessionInfo[]> => {
    return await invoke<SessionInfo[]>("list_active_sessions");
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => {
    return await invoke<AppSettings>("get_settings");
  },

  updateSettings: async (settings: AppSettings): Promise<void> => {
    return await invoke<void>("update_settings", { settings });
  },

  // Event Listeners
  onPtyOutput: async (
    callback: (payload: PtyOutputPayload) => void,
  ): Promise<UnlistenFn> => {
    return await listen<PtyOutputPayload>("pty-output", (event) => {
      callback(event.payload);
    });
  },

  onPtyExit: async (
    callback: (payload: PtyExitPayload) => void,
  ): Promise<UnlistenFn> => {
    return await listen<PtyExitPayload>("pty-exit", (event) => {
      callback(event.payload);
    });
  },
};
