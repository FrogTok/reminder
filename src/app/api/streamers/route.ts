import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const streamers = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: { id: true, displayName: true, username: true },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(streamers);
}
