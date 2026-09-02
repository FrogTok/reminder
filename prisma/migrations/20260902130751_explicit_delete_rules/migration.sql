-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_streamerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
