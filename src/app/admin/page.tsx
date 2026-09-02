import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUserManager } from "@/components/AdminUserManager";
import type { ManagedUser } from "@/lib/types";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users: ManagedUser[] = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      managerId: true,
    },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });

  return <AdminUserManager initialUsers={users} currentUserId={session.user.id} />;
}
