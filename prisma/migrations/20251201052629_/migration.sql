/*
  Warnings:

  - You are about to drop the column `settingCodeHash` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "settingCodeHash",
ADD COLUMN     "settingCodeEncrypted" TEXT;
