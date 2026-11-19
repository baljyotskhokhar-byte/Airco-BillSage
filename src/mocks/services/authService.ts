import { STORAGE_KEYS } from "@/lib/constants";
import { DEMO_USER } from "@/mocks/data/seed";
import type { UserProfile } from "@/types";
import { readStorage, removeStorage, simulateLatency, writeStorage } from "./storage";

export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  pinCode: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

interface StoredAccount {
  profile: UserProfile;
  password: string;
}

function getStoredAccounts(): StoredAccount[] {
  return readStorage<StoredAccount[]>(STORAGE_KEYS.USERS, [
    {
      profile: DEMO_USER,
      password: "demo-password",
    },
  ]);
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    // Seed a default demo session on first visit so evaluators enter the workspace immediately,
    // unless the user explicitly signed out (marked by a sentinel string "signed_out").
    const raw = window.localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (raw === null) {
      writeStorage(STORAGE_KEYS.AUTH_USER, DEMO_USER);
      return DEMO_USER;
    }
    if (raw === '"signed_out"' || raw === "signed_out") {
      return null;
    }
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },

  async login(input: LoginInput): Promise<UserProfile> {
    await simulateLatency(350);
    const accounts = getStoredAccounts();
    const idLower = input.identifier.trim().toLowerCase();
    const match = accounts.find(
      (a) =>
        a.profile.email.toLowerCase() === idLower ||
        a.profile.username.toLowerCase() === idLower
    );

    if (match) {
      if (match.password !== input.password) {
        throw new Error("Incorrect password. Please try again or use the demo sign-in.");
      }
      writeStorage(STORAGE_KEYS.AUTH_USER, match.profile);
      return match.profile;
    }

    // Allow flexible mock login for non-demo arbitrary accounts if password >= 4 chars
    if (input.password.length < 4) {
      throw new Error("Invalid credentials. Password must be at least 4 characters.");
    }

    const adhocUser: UserProfile = {
      ...DEMO_USER,
      id: `usr-${Date.now()}`,
      fullName: input.identifier.includes("@")
        ? input.identifier.split("@")[0].replace(/[._]/g, " ")
        : input.identifier,
      username: input.identifier.includes("@") ? input.identifier.split("@")[0] : input.identifier,
      email: input.identifier.includes("@") ? input.identifier : `${input.identifier}@aircoenterprises.in`,
    };
    writeStorage(STORAGE_KEYS.AUTH_USER, adhocUser);
    return adhocUser;
  },

  async loginDemo(): Promise<UserProfile> {
    await simulateLatency(200);
    writeStorage(STORAGE_KEYS.AUTH_USER, DEMO_USER);
    return DEMO_USER;
  },

  async register(input: RegisterInput): Promise<UserProfile> {
    await simulateLatency(450);
    const accounts = getStoredAccounts();
    const exists = accounts.some(
      (a) =>
        a.profile.email.toLowerCase() === input.email.toLowerCase() ||
        a.profile.username.toLowerCase() === input.username.toLowerCase()
    );
    if (exists) {
      throw new Error("An account with this email or username already exists.");
    }

    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      fullName: input.fullName.trim(),
      username: input.username.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      pinCode: input.pinCode.trim(),
      role: "Workspace Owner",
      avatarUrl: DEMO_USER.avatarUrl,
    };

    const updated = [...accounts, { profile: newProfile, password: input.password }];
    writeStorage(STORAGE_KEYS.USERS, updated);
    writeStorage(STORAGE_KEYS.AUTH_USER, newProfile);
    return newProfile;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await simulateLatency(350);
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await simulateLatency(250);
    const current = this.getCurrentUser() ?? DEMO_USER;
    const next: UserProfile = { ...current, ...updates };
    writeStorage(STORAGE_KEYS.AUTH_USER, next);
    const accounts = getStoredAccounts().map((a) =>
      a.profile.id === next.id ? { ...a, profile: next } : a
    );
    writeStorage(STORAGE_KEYS.USERS, accounts);
    return next;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await simulateLatency(300);
    if (!currentPassword) {
      throw new Error("Please enter your current password.");
    }
    const current = this.getCurrentUser() ?? DEMO_USER;
    const accounts = getStoredAccounts().map((a) =>
      a.profile.id === current.id ? { ...a, password: newPassword } : a
    );
    writeStorage(STORAGE_KEYS.USERS, accounts);
  },

  logout(): void {
    removeStorage(STORAGE_KEYS.AUTH_USER);
    writeStorage(STORAGE_KEYS.AUTH_USER, "signed_out");
  },
};
