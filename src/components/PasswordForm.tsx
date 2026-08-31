"use client";

import { useState } from "react";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "비밀번호 변경에 실패했습니다.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium text-muted">
          현재 비밀번호
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-muted">
          새 비밀번호 (8자 이상)
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-muted">
          새 비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-green/15 px-3 py-2 text-sm text-green">
          비밀번호가 변경되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 self-start rounded-sm bg-primary px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
      >
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
