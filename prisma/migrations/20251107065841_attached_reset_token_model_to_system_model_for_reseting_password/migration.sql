/*
  Warnings:

  - A unique constraint covering the columns `[systemId]` on the table `ResetToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `systemId` to the `ResetToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ResetToken" ADD COLUMN     "systemId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ResetToken_systemId_key" ON "public"."ResetToken"("systemId");

-- AddForeignKey
ALTER TABLE "public"."ResetToken" ADD CONSTRAINT "ResetToken_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."SystemCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
