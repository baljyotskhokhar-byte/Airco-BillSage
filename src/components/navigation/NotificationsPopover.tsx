import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelativeDate } from "@/lib/formatters";
import { notificationService } from "@/mocks/services/notificationService";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list(),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (next) => queryClient.setQueryData(["notifications"], next),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: (next) => queryClient.setQueryData(["notifications"], next),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onSuccess: (next) => queryClient.setQueryData(["notifications"], next),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-charcoal)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--brand-burgundy)] px-1 text-[10px] font-semibold text-white tabular-nums">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] sm:w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--brand-navy)]">Notifications</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {unreadCount > 0 ? `${unreadCount} unread updates` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand-burgundy)] hover:underline cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[var(--text-secondary)]">
              No notifications right now.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-surface)]",
                  !item.read && "bg-[var(--brand-burgundy-bg)]/45"
                )}
              >
                <div className="mt-1 shrink-0">
                  <span
                    className={cn(
                      "block h-2 w-2 rounded-full",
                      item.read ? "bg-transparent" : "bg-[var(--brand-burgundy)]"
                    )}
                    aria-hidden="true"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!item.read) markReadMutation.mutate(item.id);
                    setOpen(false);
                    navigate(item.linkTo);
                  }}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)] leading-snug">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {formatRelativeDate(item.timestamp)}
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(item.id)}
                      title="Mark as read"
                      aria-label="Mark as read"
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(item.id)}
                    title="Clear notification"
                    aria-label="Clear notification"
                    className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
