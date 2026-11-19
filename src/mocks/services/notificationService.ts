import { STORAGE_KEYS } from "@/lib/constants";
import { SEED_ACTIVITY, SEED_NOTIFICATIONS } from "@/mocks/data/seed";
import type { ActivityEvent, AppNotification } from "@/types";
import { readStorage, simulateLatency, writeStorage } from "./storage";

function getNotificationsList(): AppNotification[] {
  return readStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
}

function getActivityList(): ActivityEvent[] {
  return readStorage<ActivityEvent[]>(STORAGE_KEYS.ACTIVITY, SEED_ACTIVITY);
}

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    await simulateLatency(80);
    return getNotificationsList().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  async markAsRead(id: string): Promise<AppNotification[]> {
    const next = getNotificationsList().map((n) => (n.id === id ? { ...n, read: true } : n));
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, next);
    return next;
  },

  async markAllAsRead(): Promise<AppNotification[]> {
    const next = getNotificationsList().map((n) => ({ ...n, read: true }));
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, next);
    return next;
  },

  async remove(id: string): Promise<AppNotification[]> {
    const next = getNotificationsList().filter((n) => n.id !== id);
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, next);
    return next;
  },

  push(notification: Omit<AppNotification, "id" | "timestamp" | "read">): void {
    const current = getNotificationsList();
    const created: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date("2026-11-19T18:30:00").toISOString(),
      read: false,
    };
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, [created, ...current]);
  },

  async listActivity(): Promise<ActivityEvent[]> {
    await simulateLatency(80);
    return getActivityList().slice(0, 12);
  },

  pushActivity(event: Omit<ActivityEvent, "id" | "timestamp">): void {
    const current = getActivityList();
    const created: ActivityEvent = {
      ...event,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.ACTIVITY, [created, ...current]);
  },
};
