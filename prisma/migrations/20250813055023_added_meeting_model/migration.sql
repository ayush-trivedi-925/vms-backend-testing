-- CreateEnum
CREATE TYPE "public"."meetingStatus" AS ENUM ('ONGOING', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorOrg" TEXT NOT NULL,
    "visitorEmail" TEXT NOT NULL,
    "reception" TEXT NOT NULL,
    "reasonOfVisit" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "public"."meetingStatus" NOT NULL DEFAULT 'ONGOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);
