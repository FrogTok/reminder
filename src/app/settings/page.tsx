import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PasswordForm } from "@/components/PasswordForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted">
          {session.user.name} ({session.user.username}) 계정의 비밀번호를 변경합니다.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-surface-indigo p-6">
        <PasswordForm />
      </div>
    </div>
  );
}
