import Image from "next/image";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface-indigo p-8 shadow-[0_3px_68px_rgba(69,42,124,0.25)]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/reminder-logo.png"
            alt="리마인더 로고"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <h1 className="font-display text-2xl font-bold">리마인더</h1>
          <p className="text-sm text-muted">
            제공받은 계정으로 로그인해주세요.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl || "/"} />
      </div>
    </div>
  );
}
