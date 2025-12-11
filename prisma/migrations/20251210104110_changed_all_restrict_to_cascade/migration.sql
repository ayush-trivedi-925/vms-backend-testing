-- DropForeignKey
ALTER TABLE "public"."AttendanceEvent" DROP CONSTRAINT "AttendanceEvent_staffId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Visit" DROP CONSTRAINT "Visit_staffId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
