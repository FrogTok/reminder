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
  const status = body?.status;
  if (status !== "DONE" && status !== "PENDING") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const existing = await canAccessReminder(id, session.user);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const reminder = await prisma.reminder.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      completedById: status === "DONE" ? session.user.id : null,
    },
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
