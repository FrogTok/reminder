import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

type AccountSeed =
  | { username: string; displayName: string; role: "MANAGER" }
  | { username: string; displayName: string; role: "STREAMER"; managerUsername: string };

// 매니저를 먼저 만들고, 각 스트리머는 managerUsername으로 담당 매니저를 지정합니다.
// 스트리머는 본인의 매니저와만 리마인더를 공유합니다.
const accounts: AccountSeed[] = [
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

    const password = randomPassword();
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
    const lines = [
      "# 초기 계정 정보 (이 파일은 git에 커밋되지 않습니다)",
      "",
      "로그인 후 반드시 설정 페이지에서 비밀번호를 변경하세요.",
      "",
      ...created.map(({ account, password }) => {
        const role = account.role === "MANAGER" ? "매니저" : "스트리머";
        const managed =
          account.role === "STREAMER" ? ` (담당 매니저: ${account.managerUsername})` : "";
        return `- ${role} (${account.displayName})${managed} : 아이디 \`${account.username}\` / 비밀번호 \`${password}\``;
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
