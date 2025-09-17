/*
  Warnings:

  - You are about to drop the column `department` on the `Staff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Staff" DROP COLUMN "department",
ADD COLUMN     "departmentId" TEXT NOT NULL DEFAULT '7a984d8a-061f-40e0-96af-3d91ba0d107f';

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
