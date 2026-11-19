import { STORAGE_KEYS } from "@/lib/constants";
import { SEED_PREFERENCES, SEED_WORKSPACE } from "@/mocks/data/seed";
import type { UserPreferences, WorkspaceSettings } from "@/types";
import { readStorage, simulateLatency, writeStorage } from "./storage";

export const settingsService = {
  getPreferences(): UserPreferences {
    return readStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, SEED_PREFERENCES);
  },

  async savePreferences(next: UserPreferences): Promise<UserPreferences> {
    await simulateLatency(200);
    writeStorage(STORAGE_KEYS.PREFERENCES, next);
    return next;
  },

  getWorkspace(): WorkspaceSettings {
    return readStorage<WorkspaceSettings>(STORAGE_KEYS.WORKSPACE, SEED_WORKSPACE);
  },

  async saveWorkspace(next: WorkspaceSettings): Promise<WorkspaceSettings> {
    await simulateLatency(220);
    writeStorage(STORAGE_KEYS.WORKSPACE, next);
    return next;
  },
};
