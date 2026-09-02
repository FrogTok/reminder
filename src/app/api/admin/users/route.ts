import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      managerId: true,
    },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "MANAGER" && role !== "STREAMER") {
    return NextResponse.json({ error: "역할을 선택해주세요." }, { status: 400 });
  }

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!username || !/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "아이디는 영문/숫자/._- 조합 3~32자로 입력해주세요." },
      { status: 400 },
    );
  }
  if (!displayName) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  let managerId: string | null = null;
  if (role === "STREAMER") {
    const requestedManagerId = typeof body?.managerId === "string" ? body.managerId : "";
    const manager = requestedManagerId
      ? await prisma.user.findUnique({ where: { id: requestedManagerId } })
      : null;
    if (!manager || manager.role !== "MANAGER") {
      return NextResponse.json(
        { error: "담당 매니저를 선택해주세요." },
        { status: 400 },
      );
    }
    managerId = manager.id;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, displayName, role, managerId, passwordHash },
    select: { id: true, username: true, displayName: true, role: true, managerId: true },
  });

  return NextResponse.json({ user, password }, { status: 201 });
}
