import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canAccessReminder(reminderId: string, user: { id: string; role: Role }) {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { streamer: { select: { id: true, managerId: true } } },
  });
  if (!reminder) return null;

  const allowed =
    user.role === "STREAMER"
      ? reminder.streamerId === user.id
      : reminder.streamer.managerId === user.id;

  return allowed ? reminder : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const hasStatusUpdate = "status" in body;
  const hasContentUpdate = "title" in body || "description" in body || "dueAt" in body;
  if (!hasStatusUpdate && !hasContentUpdate) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const existing = await canAccessReminder(id, session.user);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: {
    status?: "DONE" | "PENDING";
    completedAt?: Date | null;
    completedById?: string | null;
    title?: string;
    description?: string | null;
    dueAt?: Date | null;
  } = {};

  if (hasStatusUpdate) {
    const status = body.status;
    if (status !== "DONE" && status !== "PENDING") {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = status;
    data.completedAt = status === "DONE" ? new Date() : null;
    data.completedById = status === "DONE" ? session.user.id : null;
  }

  if (hasContentUpdate) {
    // canAccessReminder already scoped `existing` to the caller's own board
    // (a manager's own streamer, or a streamer's own schedule), so anyone
    // who can see this reminder can edit its content — unlike delete, which
    // stays restricted to whoever originally created it.
    if ("title" in body) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
      }
      data.title = title;
    }

    if ("description" in body) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if ("dueAt" in body) {
      let dueAt: Date | null = null;
      if (typeof body.dueAt === "string" && body.dueAt) {
        const parsed = new Date(body.dueAt);
        if (!Number.isNaN(parsed.getTime())) {
          dueAt = parsed;
        }
      }
      data.dueAt = dueAt;
    }
  }

  const reminder = await prisma.reminder.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { displayName: true } },
      completedBy: { select: { displayName: true } },
    },
  });

  return NextResponse.json(reminder);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await canAccessReminder(id, session.user);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 매니저는 담당 스트리머의 모든 일정을, 스트리머는 본인이 등록한 일정만 삭제할 수 있습니다.
  const canDelete =
    session.user.role === "MANAGER" || existing.createdById === session.user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.reminder.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
