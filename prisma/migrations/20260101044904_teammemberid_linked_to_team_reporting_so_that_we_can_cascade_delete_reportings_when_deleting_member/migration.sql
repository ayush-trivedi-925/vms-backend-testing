/*
  Warnings:

  - A unique constraint covering the columns `[teamId,staffId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."TeamReporting" ADD COLUMN     "teamMemberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_staffId_key" ON "public"."TeamMember"("teamId", "staffId");

-- AddForeignKey
ALTER TABLE "public"."TeamReporting" ADD CONSTRAINT "TeamReporting_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "public"."TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
