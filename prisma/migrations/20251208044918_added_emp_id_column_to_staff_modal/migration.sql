/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Visit" DROP CONSTRAINT "Visit_staffId_fkey";

-- AlterTable
ALTER TABLE "public"."Staff" ADD COLUMN     "badgeActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "employeeCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_employeeCode_key" ON "public"."Staff"("employeeCode");

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
