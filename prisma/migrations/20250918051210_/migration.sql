-- DropForeignKey
ALTER TABLE "public"."Department" DROP CONSTRAINT "Department_orgId_fkey";

-- AlterTable
ALTER TABLE "public"."Staff" ALTER COLUMN "departmentId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
