import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const where =
    session.user.role === "MANAGER"
      ? { streamer: { managerId: session.user.id } }
      : { streamerId: session.user.id };

  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { displayName: true } },
      completedBy: { select: { displayName: true } },
    },
  });

  return NextResponse.json(reminders);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }

  let streamerId: string;
  if (session.user.role === "STREAMER") {
    // 스트리머는 항상 본인 일정으로만 등록합니다.
    streamerId = session.user.id;
  } else {
    const requestedId = typeof body?.streamerId === "string" ? body.streamerId : "";
    const streamer = requestedId
      ? await prisma.user.findUnique({ where: { id: requestedId } })
      : null;
    if (!streamer || streamer.role !== "STREAMER" || streamer.managerId !== session.user.id) {
      return NextResponse.json(
        { error: "담당 스트리머만 리마인더를 등록할 수 있습니다." },
        { status: 403 },
      );
    }
    streamerId = streamer.id;
  }

  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  let dueAt: Date | null = null;
  if (typeof body?.dueAt === "string" && body.dueAt) {
    const parsed = new Date(body.dueAt);
    if (!Number.isNaN(parsed.getTime())) {
      dueAt = parsed;
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      title,
      description,
      dueAt,
      streamerId,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { displayName: true } },
      completedBy: { select: { displayName: true } },
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}
