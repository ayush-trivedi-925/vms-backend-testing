/*
  Warnings:

  - You are about to drop the column `visitorName` on the `Meeting` table. All the data in the column will be lost.
  - Added the required column `visitorFirstName` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visitorLastName` to the `Meeting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Meeting" DROP COLUMN "visitorName",
ADD COLUMN     "visitorFirstName" TEXT NOT NULL,
ADD COLUMN     "visitorLastName" TEXT NOT NULL;
