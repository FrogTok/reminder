import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { generatePassword } from "../src/lib/password";

const prisma = new PrismaClient();

type AccountSeed =
  | { username: string; displayName: string; role: "ADMIN" }
  | { username: string; displayName: string; role: "MANAGER" }
  | { username: string; displayName: string; role: "STREAMER"; managerUsername: string };

// 관리자는 계정 관리 화면(/admin)에서 매니저/스트리머 계정을 직접 만들 수 있습니다.
// 매니저를 먼저 만들고, 각 스트리머는 managerUsername으로 담당 매니저를 지정합니다.
const accounts: AccountSeed[] = [
  { username: "admin1", displayName: "관리자", role: "ADMIN" },
  { username: "manager1", displayName: "매니저1", role: "MANAGER" },
  { username: "manager2", displayName: "매니저2", role: "MANAGER" },
  { username: "streamer1", displayName: "스트리머1", role: "STREAMER", managerUsername: "manager1" },
  { username: "streamer2", displayName: "스트리머2", role: "STREAMER", managerUsername: "manager1" },
  { username: "streamer3", displayName: "스트리머3", role: "STREAMER", managerUsername: "manager2" },
];

async function main() {
  const created: { account: AccountSeed; password: string }[] = [];

  for (const account of accounts) {
    const existing = await prisma.user.findUnique({
      where: { username: account.username },
    });
    if (existing) {
      console.log(`- 이미 존재함, 건너뜀: ${account.username}`);
      continue;
    }

    let managerId: string | undefined;
    if (account.role === "STREAMER") {
      const manager = await prisma.user.findUnique({
        where: { username: account.managerUsername },
      });
      if (!manager) {
        throw new Error(
          `${account.username}의 담당 매니저(${account.managerUsername})를 먼저 시드해야 합니다.`,
        );
      }
      managerId = manager.id;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        passwordHash,
        managerId,
      },
    });

    created.push({ account, password });
  }

  if (created.length > 0) {
    const roleLabel = { ADMIN: "관리자", MANAGER: "매니저", STREAMER: "스트리머" } as const;
    const lines = [
      "# 초기 계정 정보 (이 파일은 git에 커밋되지 않습니다)",
      "",
      "로그인 후 반드시 설정 페이지에서 비밀번호를 변경하세요.",
      "",
      ...created.map(({ account, password }) => {
        const managed =
          account.role === "STREAMER" ? ` (담당 매니저: ${account.managerUsername})` : "";
        return `- ${roleLabel[account.role]} (${account.displayName})${managed} : 아이디 \`${account.username}\` / 비밀번호 \`${password}\``;
      }),
      "",
    ];
    const outPath = path.join(process.cwd(), "CREDENTIALS.local.md");
    fs.writeFileSync(outPath, lines.join("\n"), "utf8");
    console.log("\n생성된 계정 정보를 CREDENTIALS.local.md 파일에 저장했습니다.\n");
    console.log(lines.join("\n"));
  } else {
    console.log("\n새로 생성된 계정이 없습니다.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
