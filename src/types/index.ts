export interface Profile {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  codexHome: string;
  defaultProjectDir?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  orderIndex: number;
  isPinned: boolean;
}

export type AuthStatus =
  | { status: "logged_in"; detail: string }
  | { status: "not_logged_in" }
  | { status: "authenticating" }
  | { status: "error"; detail: string }
  | { status: "unknown" };

export interface ProfileSummary {
  profile: Profile;
  authStatus: AuthStatus;
  activeSessionsCount: number;
}

export interface CreateProfileRequest {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  defaultProjectDir?: string | null;
}

export interface UpdateProfileRequest {
  id: string;
  name?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  defaultProjectDir?: string | null;
  isPinned?: boolean | null;
}

export interface AppSettings {
  codexPath?: string | null;
  defaultWorkingDir?: string | null;
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalLineHeight: number;
  terminalCursorStyle: "block" | "underline" | "bar";
  terminalCursorBlink: boolean;
  terminalScrollback: number;
  theme: string;
  confirmCloseSession: boolean;
  warnDuplicateWorkingDir: boolean;
}

export interface SessionInfo {
  id: string;
  profileId: string;
  profileName: string;
  profileColor: string;
  cwd: string;
  createdAt: string;
  pid: number;
  isAlive: boolean;
  isLoginSession: boolean;
  title: string;
}

export interface CodexBinaryInfo {
  path: string;
  version?: string | null;
  isActive: boolean;
}

export interface CodexDetectionResult {
  found: boolean;
  path?: string | null;
  version?: string | null;
  isOfficial: boolean;
  error?: string | null;
  allCandidates?: CodexBinaryInfo[];
}

export interface CodexUpdateResult {
  success: boolean;
  oldVersion?: string | null;
  newVersion?: string | null;
  message: string;
  path?: string | null;
}

export interface PtyOutputPayload {
  sessionId: string;
  data: string;
}

export interface PtyExitPayload {
  sessionId: string;
  exitCode?: number | null;
}
