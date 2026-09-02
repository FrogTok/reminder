"use client";

import { useMemo, useState } from "react";
import type { ReminderDto, StreamerSummary } from "@/lib/types";
import { NewReminderForm } from "@/components/NewReminderForm";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(reminder: ReminderDto) {
  if (reminder.status !== "PENDING" || !reminder.dueAt) return false;
  return new Date(reminder.dueAt).getTime() < Date.now();
}

// datetime-local 입력은 로컬 시간 기준 "YYYY-MM-DDTHH:mm" 문자열을 기대합니다.
function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const URL_SPLIT_PATTERN = /(https?:\/\/[^\s]+)/g;
// No `g` flag here — this only ever tests a single split part, and reusing a
// `g`-flagged RegExp across calls to `.test()` carries lastIndex state that
// makes matches alternate true/false on repeat calls.
const URL_TEST_PATTERN = /^https?:\/\//;
const TRAILING_PUNCTUATION = /[).,!?;:]+$/;

// 제목/설명에 들어있는 URL을 새 탭에서 열리는 링크로 바꿔줍니다. 문장 끝에 붙은
// 마침표·쉼표 등은 링크에서 잘라내 실제 URL만 정확히 걸리도록 합니다.
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_SPLIT_PATTERN);
  return (
    <>
      {parts.map((part, index) => {
        if (!URL_TEST_PATTERN.test(part)) {
          return <span key={index}>{part}</span>;
        }
        const trailingMatch = part.match(TRAILING_PUNCTUATION);
        const trailing = trailingMatch ? trailingMatch[0] : "";
        const url = trailing ? part.slice(0, part.length - trailing.length) : part;
        return (
          <span key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="break-all text-link underline underline-offset-2 hover:text-link/80"
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}

export function ReminderBoard({
  initialReminders,
  role,
  currentUserId,
  streamers,
  managerDisplayName,
}: {
  initialReminders: ReminderDto[];
  role: "MANAGER" | "STREAMER";
  currentUserId: string;
  streamers: StreamerSummary[];
  managerDisplayName: string | null;
}) {
  const [reminders, setReminders] = useState<ReminderDto[]>(initialReminders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedStreamerId, setSelectedStreamerId] = useState<string | null>(
    streamers[0]?.id ?? null,
  );
  const [doneCollapsed, setDoneCollapsed] = useState(false);

  function toggleDoneCollapsed() {
    setDoneCollapsed((prev) => !prev);
  }

  const isManager = role === "MANAGER";
  // 매니저는 선택한 탭의 스트리머, 스트리머는 항상 본인을 대상으로 등록/조회합니다.
  const targetStreamerId = isManager ? selectedStreamerId : currentUserId;
  const scopedReminders = isManager
    ? reminders.filter((r) => r.streamerId === selectedStreamerId)
    : reminders;

  function canDelete(reminder: ReminderDto) {
    return isManager || reminder.createdById === currentUserId;
  }

  function toggleMenu(reminderId: string) {
    setMenuOpenId((prev) => (prev === reminderId ? null : reminderId));
  }

  function startEdit(reminderId: string) {
    setMenuOpenId(null);
    setEditingId(reminderId);
  }

  function requestDelete(reminderId: string) {
    setMenuOpenId(null);
    setConfirmDeleteId(reminderId);
  }

  const { pending, done } = useMemo(() => {
    const pending = scopedReminders
      .filter((r) => r.status === "PENDING")
      .sort((a, b) => {
        if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    const done = scopedReminders
      .filter((r) => r.status === "DONE")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { pending, done };
  }, [scopedReminders]);

  async function refresh() {
    const res = await fetch("/api/reminders", { cache: "no-store" });
    if (res.ok) {
      setReminders(await res.json());
    }
  }

  async function handleCreate(input: {
    title: string;
    description: string;
    dueAt: string;
  }) {
    if (!targetStreamerId) {
      return "담당 스트리머를 먼저 선택해주세요.";
    }
    setListError(null);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        description: input.description || null,
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
        streamerId: targetStreamerId,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? "리마인더 등록에 실패했습니다.";
    }

    await refresh();
    return null;
  }

  async function handleToggle(reminder: ReminderDto) {
    setBusyId(reminder.id);
    setListError(null);
    const nextStatus = reminder.status === "PENDING" ? "DONE" : "PENDING";

    const res = await fetch(`/api/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    setBusyId(null);
    if (!res.ok) {
      setListError("상태 변경에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    await refresh();
  }

  async function handleUpdateContent(
    reminder: ReminderDto,
    input: { title: string; description: string; dueAt: string },
  ) {
    if (!input.title) {
      return "제목을 입력해주세요.";
    }
    setBusyId(reminder.id);
    setListError(null);

    const res = await fetch(`/api/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        description: input.description || null,
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
      }),
    });

    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? "수정에 실패했습니다.";
    }

    setEditingId(null);
    await refresh();
    return null;
  }

  async function handleDelete(reminder: ReminderDto) {
    setBusyId(reminder.id);
    setListError(null);

    const res = await fetch(`/api/reminders/${reminder.id}`, {
      method: "DELETE",
    });

    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      setListError("삭제에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    await refresh();
  }

  const selectedStreamer = streamers.find((s) => s.id === selectedStreamerId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              스케줄 리마인더
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isManager
                ? "담당 스트리머를 선택해 스케줄을 등록하고 처리 현황을 확인하세요."
                : "직접 일정을 등록하거나, 매니저가 등록한 스케줄을 확인해 처리 완료 시 표시해주세요."}
            </p>
            {!isManager && (
              <p className="mt-1 text-xs text-muted">
                담당 매니저: {managerDisplayName ?? "지정되지 않음"}
              </p>
            )}
          </div>
          {targetStreamerId && <NewReminderForm onCreate={handleCreate} />}
        </div>

        {isManager && (
          <div className="mt-5 flex flex-wrap gap-2">
            {streamers.map((streamer) => (
              <button
                key={streamer.id}
                type="button"
                onClick={() => setSelectedStreamerId(streamer.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  streamer.id === selectedStreamerId
                    ? "bg-primary text-ink"
                    : "bg-surface-indigo text-muted hover:text-ink hover:bg-surface-indigo-hover"
                }`}
              >
                {streamer.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {isManager && streamers.length === 0 && (
        <EmptyState text="담당 스트리머가 없습니다. 관리자에게 문의해주세요." />
      )}

      {(!isManager || selectedStreamer) && (
        <>
          {listError && (
            <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
              {listError}
            </p>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              처리 대기
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-ink">
                {pending.length}
              </span>
            </h2>

            {pending.length === 0 ? (
              <EmptyState text="대기 중인 리마인더가 없습니다." />
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-indigo p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    {editingId === reminder.id ? (
                      <EditReminderForm
                        reminder={reminder}
                        busy={busyId === reminder.id}
                        onSave={(input) => handleUpdateContent(reminder, input)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">
                              <Linkified text={reminder.title} />
                            </h3>
                            {isOverdue(reminder) && (
                              <span className="rounded-full bg-danger/20 px-2 py-0.5 text-xs font-semibold text-danger">
                                기한 지남
                              </span>
                            )}
                          </div>
                          {reminder.description && (
                            <p className="whitespace-pre-wrap text-sm text-muted">
                              <Linkified text={reminder.description} />
                            </p>
                          )}
                          <p className="text-xs text-muted">
                            {reminder.dueAt && <>마감 {formatDate(reminder.dueAt)} · </>}
                            등록 {formatDate(reminder.createdAt)} · {reminder.createdBy.displayName}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {confirmDeleteId === reminder.id ? (
                            <DeleteConfirm
                              busy={busyId === reminder.id}
                              onConfirm={() => handleDelete(reminder)}
                              onCancel={() => setConfirmDeleteId(null)}
                            />
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={busyId === reminder.id}
                                onClick={() => handleToggle(reminder)}
                                className="rounded-sm bg-green px-4 py-2 text-sm font-semibold text-ink-dark transition-colors hover:bg-green-hover disabled:opacity-60 cursor-pointer"
                              >
                                완료 처리
                              </button>
                              <RowMenu
                                busy={busyId === reminder.id}
                                canDelete={canDelete(reminder)}
                                isOpen={menuOpenId === reminder.id}
                                onToggle={() => toggleMenu(reminder.id)}
                                onEdit={() => startEdit(reminder.id)}
                                onDeleteRequest={() => requestDelete(reminder.id)}
                              />
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={toggleDoneCollapsed}
              aria-expanded={!doneCollapsed}
              className="flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted cursor-pointer hover:text-ink"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-3.5 w-3.5 transition-transform ${doneCollapsed ? "-rotate-90" : ""}`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
              완료
              <span className="rounded-full bg-surface-onyx px-2 py-0.5 text-xs font-bold text-ink">
                {done.length}
              </span>
            </button>

            {doneCollapsed ? null : done.length === 0 ? (
              <EmptyState text="아직 완료된 리마인더가 없습니다." />
            ) : (
              <div className="flex flex-col gap-3">
                {done.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-indigo/50 p-4 opacity-80 sm:flex-row sm:items-start sm:justify-between"
                  >
                    {editingId === reminder.id ? (
                      <EditReminderForm
                        reminder={reminder}
                        busy={busyId === reminder.id}
                        onSave={(input) => handleUpdateContent(reminder, input)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <h3 className="font-semibold text-ink line-through decoration-muted">
                            <Linkified text={reminder.title} />
                          </h3>
                          {reminder.description && (
                            <p className="whitespace-pre-wrap text-sm text-muted">
                              <Linkified text={reminder.description} />
                            </p>
                          )}
                          <p className="text-xs text-muted">
                            완료 {formatDate(reminder.completedAt)} ·{" "}
                            {reminder.completedBy?.displayName ?? "-"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {confirmDeleteId === reminder.id ? (
                            <DeleteConfirm
                              busy={busyId === reminder.id}
                              onConfirm={() => handleDelete(reminder)}
                              onCancel={() => setConfirmDeleteId(null)}
                            />
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={busyId === reminder.id}
                                onClick={() => handleToggle(reminder)}
                                className="rounded-sm bg-surface-onyx px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
                              >
                                되돌리기
                              </button>
                              <RowMenu
                                busy={busyId === reminder.id}
                                canDelete={canDelete(reminder)}
                                isOpen={menuOpenId === reminder.id}
                                onToggle={() => toggleMenu(reminder.id)}
                                onEdit={() => startEdit(reminder.id)}
                                onDeleteRequest={() => requestDelete(reminder.id)}
                              />
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function EditReminderForm({
  reminder,
  busy,
  onSave,
  onCancel,
}: {
  reminder: ReminderDto;
  busy: boolean;
  onSave: (input: { title: string; description: string; dueAt: string }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description ?? "");
  const [dueAt, setDueAt] = useState(reminder.dueAt ? toDatetimeLocalValue(reminder.dueAt) : "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await onSave({ title: title.trim(), description: description.trim(), dueAt });
    if (result) {
      setError(result);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">제목</label>
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">설명 (선택)</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="resize-none rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">마감 일시 (선택)</label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
        >
          {busy ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-sm bg-surface-onyx px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function RowMenu({
  busy,
  canDelete,
  isOpen,
  onToggle,
  onEdit,
  onDeleteRequest,
}: {
  busy: boolean;
  canDelete: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
}) {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="더 보기"
        aria-expanded={false}
        className="rounded-sm bg-surface-onyx p-2.5 text-ink transition-colors hover:bg-surface-onyx/70 cursor-pointer"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onEdit}
        className="rounded-sm bg-surface-onyx px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
      >
        수정
      </button>
      {canDelete && (
        <button
          type="button"
          disabled={busy}
          onClick={onDeleteRequest}
          className="rounded-sm bg-surface-onyx px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-danger/80 disabled:opacity-60 cursor-pointer"
        >
          삭제
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label="닫기"
        aria-expanded={true}
        className="rounded-sm bg-surface-onyx p-2.5 text-ink transition-colors hover:bg-surface-onyx/70 cursor-pointer"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M5.22 5.22a.75.75 0 011.06 0L10 8.94l3.72-3.72a.75.75 0 111.06 1.06L11.06 10l3.72 3.72a.75.75 0 11-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 01-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </>
  );
}

function DeleteConfirm({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">삭제할까요?</span>
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="rounded-sm bg-danger px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-danger/80 disabled:opacity-60 cursor-pointer"
      >
        {busy ? "삭제 중..." : "삭제"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="rounded-sm bg-surface-onyx px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
      >
        취소
      </button>
    </div>
  );
}
