"use client";

import { useState } from "react";

export function NewReminderForm({
  onCreate,
}: {
  onCreate: (input: {
    title: string;
    description: string;
    dueAt: string;
  }) => Promise<string | null>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await onCreate({ title, description, dueAt });

    setLoading(false);
    if (result) {
      setError(result);
      return;
    }

    setTitle("");
    setDescription("");
    setDueAt("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm bg-green px-5 py-2.5 text-sm font-semibold text-ink-dark transition-colors hover:bg-green-hover cursor-pointer"
      >
        + 새 리마인더 등록
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-indigo p-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-muted">
          제목
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 9/3 저녁 방송 협찬 안내 고지"
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-muted">
          설명 (선택)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="세부 내용을 적어주세요."
          className="resize-none rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dueAt" className="text-sm font-medium text-muted">
          마감 일시 (선택)
        </label>
        <input
          id="dueAt"
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
        >
          {loading ? "등록 중..." : "등록"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-sm bg-surface-onyx px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-onyx/70 cursor-pointer"
        >
          취소
        </button>
      </div>
    </form>
  );
}
