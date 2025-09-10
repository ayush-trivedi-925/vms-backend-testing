/*
  Warnings:

  - You are about to drop the column `AccountStatus` on the `UserCredential` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserCredential" DROP COLUMN "AccountStatus",
ADD COLUMN     "accountStatus" "public"."AccountStatusEnum" NOT NULL DEFAULT 'Active';
