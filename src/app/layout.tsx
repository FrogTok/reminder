import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/Nav";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "리마인더",
  description: "매니저와 스트리머를 위한 스케줄 리마인더",
  icons: { icon: "/reminder-logo.png" },
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html
      lang="ko"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {session?.user && (
          <Nav displayName={session.user.name ?? session.user.username} role={session.user.role} />
        )}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
