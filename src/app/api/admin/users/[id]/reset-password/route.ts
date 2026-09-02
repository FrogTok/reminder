import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password";

export async function POST(
  _request: Request,
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

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({ password });
}
