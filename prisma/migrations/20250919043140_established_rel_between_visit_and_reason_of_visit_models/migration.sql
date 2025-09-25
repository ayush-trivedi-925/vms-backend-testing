/*
  Warnings:

  - You are about to drop the column `reasonOfVisit` on the `Visit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Visit" DROP COLUMN "reasonOfVisit",
ADD COLUMN     "reasonId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "public"."ReasonOfVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
