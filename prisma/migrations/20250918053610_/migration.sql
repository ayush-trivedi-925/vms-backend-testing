-- DropForeignKey
ALTER TABLE "public"."Staff" DROP CONSTRAINT "Staff_departmentId_fkey";

-- AlterTable
ALTER TABLE "public"."Staff" ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
