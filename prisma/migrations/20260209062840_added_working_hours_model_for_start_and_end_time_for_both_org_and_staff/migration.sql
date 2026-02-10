-- CreateEnum
CREATE TYPE "public"."Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "public"."WorkingHours" (
    "id" TEXT NOT NULL,
    "dayOfWeek" "public"."Weekday" NOT NULL,
    "startsAt" TEXT NOT NULL,
    "endsAt" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "orgId" TEXT,
    "staffId" TEXT,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_dayOfWeek_orgId_key" ON "public"."WorkingHours"("dayOfWeek", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_dayOfWeek_staffId_key" ON "public"."WorkingHours"("dayOfWeek", "staffId");

-- AddForeignKey
ALTER TABLE "public"."WorkingHours" ADD CONSTRAINT "WorkingHours_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkingHours" ADD CONSTRAINT "WorkingHours_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
