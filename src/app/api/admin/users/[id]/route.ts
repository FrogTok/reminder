import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: { displayName?: string; managerId?: string } = {};

  if (typeof body?.displayName === "string") {
    const displayName = body.displayName.trim();
    if (!displayName) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    data.displayName = displayName;
  }

  if (typeof body?.managerId === "string") {
    if (target.role !== "STREAMER") {
      return NextResponse.json(
        { error: "스트리머 계정만 담당 매니저를 지정할 수 있습니다." },
        { status: 400 },
      );
    }
    const manager = await prisma.user.findUnique({ where: { id: body.managerId } });
    if (!manager || manager.role !== "MANAGER") {
      return NextResponse.json({ error: "유효한 매니저를 선택해주세요." }, { status: 400 });
    }
    data.managerId = manager.id;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, displayName: true, role: true, managerId: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    // Native Postgres FK RESTRICT violations surface as an untyped
    // PrismaClientUnknownRequestError (no .code), not P2003 — Prisma only
    // emits P2003 when it emulates referential actions itself. Match on the
    // Postgres error text instead of relying on a structured error code.
    const message = error instanceof Error ? error.message : "";
    if (/foreign key constraint|violates.*restrict/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "이 계정과 연결된 스트리머 또는 리마인더 기록이 있어 삭제할 수 없습니다. 먼저 담당 스트리머를 다른 매니저로 옮기거나 관련 리마인더를 정리해주세요.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
