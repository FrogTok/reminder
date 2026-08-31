import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReminderBoard } from "@/components/ReminderBoard";
import type { ReminderDto, StreamerSummary } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isManager = session.user.role === "MANAGER";

  const reminderWhere = isManager
    ? { streamer: { managerId: session.user.id } }
    : { streamerId: session.user.id };

  const [reminders, streamers, managerOf] = await Promise.all([
    prisma.reminder.findMany({
      where: reminderWhere,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: { select: { displayName: true } },
        completedBy: { select: { displayName: true } },
      },
    }),
    isManager
      ? prisma.user.findMany({
          where: { managerId: session.user.id },
          select: { id: true, displayName: true, username: true },
          orderBy: { displayName: "asc" },
        })
      : Promise.resolve<StreamerSummary[]>([]),
    !isManager
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { manager: { select: { displayName: true } } },
        })
      : Promise.resolve(null),
  ]);

  const initialReminders: ReminderDto[] = reminders.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    streamerId: r.streamerId,
    createdById: r.createdById,
    createdBy: r.createdBy,
    completedBy: r.completedBy,
  }));

  return (
    <ReminderBoard
      initialReminders={initialReminders}
      role={session.user.role}
      currentUserId={session.user.id}
      streamers={streamers}
      managerDisplayName={managerOf?.manager?.displayName ?? null}
    />
  );
}
