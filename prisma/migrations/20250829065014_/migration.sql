/*
  Warnings:

  - You are about to drop the column `organizationName` on the `Visit` table. All the data in the column will be lost.
  - Added the required column `visitorOrganization` to the `Visit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Visit" DROP COLUMN "organizationName",
ADD COLUMN     "visitorOrganization" TEXT NOT NULL;
