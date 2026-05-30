"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Inbox,
  X,
} from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href?: string;
  unread?: boolean;
};

type FilterType = "all" | "unread" | "read";

export function CriticNotificationButton({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const enrichedNotifications = useMemo(() => {
    return notifications.map((item) => ({
      ...item,
      isUnread: item.unread && !readIds.has(item.id),
    }));
  }, [notifications, readIds]);

  const unreadCount = enrichedNotifications.filter((item) => item.isUnread).length;
  const readCount = enrichedNotifications.length - unreadCount;

  const filteredNotifications = enrichedNotifications.filter((item) => {
    if (filter === "unread") return item.isUnread;
    if (filter === "read") return !item.isUnread;
    return true;
  });

  function markAsRead(id: string) {
    setReadIds((current) => new Set(current).add(id));
  }

  function markAllAsRead() {
    setReadIds(new Set(notifications.map((item) => item.id)));
  }

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card transition hover:scale-[1.03] hover:bg-muted hover:shadow-[0_0_24px_rgba(59,130,246,0.15)]"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-3 backdrop-blur-sm sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />

          <div className="relative mt-14 flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:mt-16">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Critic Updates
                  </div>

                  <h2 className="mt-2 text-lg font-bold">Notifications</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Students ready for evaluation and important OJT updates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <FilterButton
                  label="All"
                  count={enrichedNotifications.length}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  label="Unread"
                  count={unreadCount}
                  active={filter === "unread"}
                  onClick={() => setFilter("unread")}
                />
                <FilterButton
                  label="Read"
                  count={readCount}
                  active={filter === "read"}
                  onClick={() => setFilter("read")}
                />
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotifications.map((item) => {
                    const card = (
                      <div
                        className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(59,130,246,0.10)] ${
                          item.isUnread
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                              item.isUnread
                                ? "bg-primary/10 text-primary"
                                : "bg-green-500/10 text-green-600"
                            }`}
                          >
                            {item.isUnread ? (
                              <Circle className="h-4 w-4 fill-current" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold">
                                {item.title}
                              </p>

                              {item.isUnread && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                                  New
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {item.message}
                            </p>

                            <div className="mt-3 flex items-center gap-3">
                              {item.href && (
                                <span className="text-xs font-semibold text-primary">
                                  Open
                                </span>
                              )}

                              {item.isUnread && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    markAsRead(item.id);
                                  }}
                                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    return item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          markAsRead(item.id);
                          setOpen(false);
                        }}
                      >
                        {card}
                      </Link>
                    ) : (
                      <div key={item.id}>{card}</div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold">
                    {filter === "unread"
                      ? "No unread notifications"
                      : filter === "read"
                      ? "No read notifications"
                      : "No notifications yet"}
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    You’ll see students ready for evaluation here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{count}</p>
    </button>
  );
}