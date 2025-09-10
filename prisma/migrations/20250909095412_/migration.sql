/*
  Warnings:

  - You are about to drop the column `contactnumber` on the `Organization` table. All the data in the column will be lost.
  - Added the required column `contactNumber` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactPerson` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "contactnumber",
ADD COLUMN     "contactNumber" TEXT NOT NULL,
ADD COLUMN     "contactPerson" TEXT NOT NULL;
