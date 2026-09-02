"use client";

import { useMemo, useState } from "react";
import type { ManagedUser } from "@/lib/types";

type Credential = { username: string; password: string; label: string };

export function AdminUserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const admins = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);
  const managers = useMemo(() => users.filter((u) => u.role === "MANAGER"), [users]);
  const streamers = useMemo(() => users.filter((u) => u.role === "STREAMER"), [users]);
  const unassignedStreamers = useMemo(
    () => streamers.filter((s) => !managers.some((m) => m.id === s.managerId)),
    [streamers, managers],
  );

  async function refresh() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) setUsers(await res.json());
  }

  async function createUser(input: {
    role: "MANAGER" | "STREAMER";
    username: string;
    displayName: string;
    managerId?: string;
  }) {
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return body?.error ?? "계정 생성에 실패했습니다.";
    }
    setCredential({
      username: body.user.username,
      password: body.password,
      label: `${input.role === "MANAGER" ? "매니저" : "스트리머"} "${body.user.displayName}" 계정이`,
    });
    await refresh();
    return null;
  }

  async function updateUser(id: string, data: { displayName?: string; managerId?: string }) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "수정에 실패했습니다.");
      return;
    }
    await refresh();
  }

  async function resetPassword(user: ManagedUser) {
    setBusyId(user.id);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setError(body?.error ?? "비밀번호 재발급에 실패했습니다.");
      return;
    }
    setCredential({
      username: user.username,
      password: body.password,
      label: `"${user.displayName}"의 새 비밀번호가`,
    });
  }

  async function deleteUser(user: ManagedUser) {
    setBusyId(user.id);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "삭제에 실패했습니다.");
      return;
    }
    await refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">계정 관리</h1>
        <p className="mt-1 text-sm text-muted">
          매니저와 스트리머 계정을 만들고, 매칭·비밀번호를 관리하세요.
        </p>
      </div>

      {credential && (
        <CredentialPanel credential={credential} onDismiss={() => setCredential(null)} />
      )}
      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <NewAccountForm
        buttonLabel="+ 새 매니저 추가"
        onCreate={(input) => createUser({ ...input, role: "MANAGER" })}
      />

      {managers.length === 0 ? (
        <EmptyState text="아직 등록된 매니저가 없습니다." />
      ) : (
        <div className="flex flex-col gap-4">
          {managers.map((manager) => (
            <ManagerCard
              key={manager.id}
              manager={manager}
              streamers={streamers.filter((s) => s.managerId === manager.id)}
              managers={managers}
              busyId={busyId}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={setConfirmDeleteId}
              onUpdate={updateUser}
              onResetPassword={resetPassword}
              onDelete={deleteUser}
              onCreateStreamer={(input) =>
                createUser({ ...input, role: "STREAMER", managerId: manager.id })
              }
            />
          ))}
        </div>
      )}

      {unassignedStreamers.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-danger">
            담당 매니저 없음
          </h2>
          <div className="flex flex-col gap-2">
            {unassignedStreamers.map((streamer) => (
              <UserRow
                key={streamer.id}
                user={streamer}
                managers={managers}
                busy={busyId === streamer.id}
                confirmingDelete={confirmDeleteId === streamer.id}
                onConfirmDelete={() => setConfirmDeleteId(streamer.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onRename={(name) => updateUser(streamer.id, { displayName: name })}
                onReassign={(managerId) => updateUser(streamer.id, { managerId })}
                onResetPassword={() => resetPassword(streamer)}
                onDelete={() => deleteUser(streamer)}
              />
            ))}
          </div>
        </section>
      )}

      {admins.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            관리자 계정
          </h2>
          <div className="flex flex-col gap-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl border border-hairline bg-surface-indigo/60 p-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {admin.displayName}
                    {admin.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted">(나)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">{admin.username}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            관리자 계정은 이 화면에서 만들 수 없습니다. 서버의 시드 스크립트(prisma/seed.ts)로
            추가해주세요.
          </p>
        </section>
      )}
    </div>
  );
}

function CredentialPanel({
  credential,
  onDismiss,
}: {
  credential: Credential;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-green/40 bg-green/10 p-4">
      <p className="text-sm font-semibold text-ink">
        {credential.label} 생성됐습니다 — 비밀번호는 지금 한 번만 표시됩니다.
      </p>
      <p className="text-sm text-ink">
        아이디 <code className="rounded bg-surface-onyx px-1.5 py-0.5">{credential.username}</code>{" "}
        · 비밀번호{" "}
        <code className="rounded bg-surface-onyx px-1.5 py-0.5">{credential.password}</code>
      </p>
      <p className="text-xs text-muted">
        전달 후 반드시 설정 페이지에서 비밀번호를 변경하도록 안내해주세요.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="self-start rounded-sm bg-surface-onyx px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-onyx/70 cursor-pointer"
      >
        확인했어요
      </button>
    </div>
  );
}

function NewAccountForm({
  buttonLabel,
  onCreate,
}: {
  buttonLabel: string;
  onCreate: (input: { username: string; displayName: string }) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await onCreate({ username: username.trim(), displayName: displayName.trim() });
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    setUsername("");
    setDisplayName("");
    setError(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-sm bg-green px-4 py-2 text-sm font-semibold text-ink-dark transition-colors hover:bg-green-hover cursor-pointer"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-indigo p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">아이디</label>
        <input
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="영문/숫자, 3~32자"
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted">이름</label>
        <input
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
        >
          {loading ? "생성 중..." : "생성"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-sm bg-surface-onyx px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-onyx/70 cursor-pointer"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function ManagerCard({
  manager,
  streamers,
  managers,
  busyId,
  confirmDeleteId,
  onConfirmDelete,
  onUpdate,
  onResetPassword,
  onDelete,
  onCreateStreamer,
}: {
  manager: ManagedUser;
  streamers: ManagedUser[];
  managers: ManagedUser[];
  busyId: string | null;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string | null) => void;
  onUpdate: (id: string, data: { displayName?: string; managerId?: string }) => Promise<void>;
  onResetPassword: (user: ManagedUser) => Promise<void>;
  onDelete: (user: ManagedUser) => Promise<void>;
  onCreateStreamer: (input: { username: string; displayName: string }) => Promise<string | null>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-indigo p-4">
      <UserRow
        user={manager}
        managers={managers}
        busy={busyId === manager.id}
        confirmingDelete={confirmDeleteId === manager.id}
        onConfirmDelete={() => onConfirmDelete(manager.id)}
        onCancelDelete={() => onConfirmDelete(null)}
        onRename={(name) => onUpdate(manager.id, { displayName: name })}
        onResetPassword={() => onResetPassword(manager)}
        onDelete={() => onDelete(manager)}
      />

      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        {streamers.length === 0 ? (
          <p className="text-sm text-muted">담당 스트리머가 없습니다.</p>
        ) : (
          streamers.map((streamer) => (
            <UserRow
              key={streamer.id}
              user={streamer}
              managers={managers}
              busy={busyId === streamer.id}
              confirmingDelete={confirmDeleteId === streamer.id}
              onConfirmDelete={() => onConfirmDelete(streamer.id)}
              onCancelDelete={() => onConfirmDelete(null)}
              onRename={(name) => onUpdate(streamer.id, { displayName: name })}
              onReassign={(managerId) => onUpdate(streamer.id, { managerId })}
              onResetPassword={() => onResetPassword(streamer)}
              onDelete={() => onDelete(streamer)}
              nested
            />
          ))
        )}
        <NewAccountForm buttonLabel="+ 스트리머 추가" onCreate={onCreateStreamer} />
      </div>
    </div>
  );
}

function UserRow({
  user,
  managers,
  busy,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onRename,
  onReassign,
  onResetPassword,
  onDelete,
  nested,
}: {
  user: ManagedUser;
  managers: ManagedUser[];
  busy: boolean;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onRename: (name: string) => void;
  onReassign?: (managerId: string) => void;
  onResetPassword: () => void;
  onDelete: () => void;
  nested?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.displayName);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between ${
        nested ? "bg-surface-indigo/60" : ""
      }`}
    >
      <div className="flex flex-1 flex-col gap-1">
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onRename(name.trim() || user.displayName);
              setEditing(false);
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-hairline bg-canvas px-2 py-1 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="text-xs font-medium text-primary cursor-pointer">
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(user.displayName);
              }}
              className="text-xs text-muted cursor-pointer"
            >
              취소
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-fit font-semibold text-ink hover:underline cursor-pointer"
          >
            {user.displayName}
          </button>
        )}
        <p className="text-xs text-muted">{user.username}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onReassign && (
          <select
            value={user.managerId ?? ""}
            onChange={(event) => onReassign(event.target.value)}
            className="rounded-lg border border-hairline bg-canvas px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
          >
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.displayName}
              </option>
            ))}
          </select>
        )}

        {confirmingDelete ? (
          <>
            <span className="text-xs text-muted">삭제할까요?</span>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-sm bg-danger px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-danger/80 disabled:opacity-60 cursor-pointer"
            >
              {busy ? "삭제 중..." : "삭제"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancelDelete}
              className="rounded-sm bg-surface-onyx px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onResetPassword}
              className="rounded-sm bg-surface-onyx px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-onyx/70 disabled:opacity-60 cursor-pointer"
            >
              비밀번호 재발급
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmDelete}
              className="rounded-sm bg-surface-onyx px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-danger/80 disabled:opacity-60 cursor-pointer"
            >
              삭제
            </button>
          </>
        )}
      </div>
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
