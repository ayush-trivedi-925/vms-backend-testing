-- CreateEnum
CREATE TYPE "public"."AttendanceEventType" AS ENUM ('PUNCH_IN', 'PUNCH_OUT', 'BREAK_START', 'BREAK_END', 'LATE_PUNCH_OUT');

-- CreateEnum
CREATE TYPE "public"."AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."AttendanceClosureType" AS ENUM ('NORMAL', 'LATE');

-- CreateEnum
CREATE TYPE "public"."AttendanceEventSource" AS ENUM ('QR', 'EMPLOYEE_ID');

-- CreateTable
CREATE TABLE "public"."AttendanceSession" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "closureType" "public"."AttendanceClosureType",
    "isLateClosure" BOOLEAN NOT NULL DEFAULT false,
    "latePunchOutReason" TEXT,
    "latePunchOutRecordedAt" TIMESTAMP(3),
    "firstPunchInAt" TIMESTAMP(3),
    "lastPunchOutAt" TIMESTAMP(3),
    "totalWorkSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalBreakSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "sessionId" TEXT,
    "eventType" "public"."AttendanceEventType" NOT NULL,
    "source" "public"."AttendanceEventSource" NOT NULL DEFAULT 'QR',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCorrection" BOOLEAN NOT NULL DEFAULT false,
    "correctionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
