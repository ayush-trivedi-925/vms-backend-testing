/*
  Warnings:

  - You are about to drop the column `host` on the `Meeting` table. All the data in the column will be lost.
  - Added the required column `hostId` to the `Meeting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Meeting" DROP COLUMN "host",
ADD COLUMN     "hostId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
