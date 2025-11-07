/*
  Warnings:

  - You are about to drop the column `systemId` on the `ResetToken` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ResetToken" DROP CONSTRAINT "ResetToken_systemId_fkey";

-- DropIndex
DROP INDEX "public"."ResetToken_systemId_key";

-- AlterTable
ALTER TABLE "public"."ResetToken" DROP COLUMN "systemId";

-- CreateTable
CREATE TABLE "public"."ResetTokenSystem" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "ResetTokenSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResetTokenSystem_token_key" ON "public"."ResetTokenSystem"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ResetTokenSystem_systemId_key" ON "public"."ResetTokenSystem"("systemId");

-- AddForeignKey
ALTER TABLE "public"."ResetTokenSystem" ADD CONSTRAINT "ResetTokenSystem_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."SystemCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
