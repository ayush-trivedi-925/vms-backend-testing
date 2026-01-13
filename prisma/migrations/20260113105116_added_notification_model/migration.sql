-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('VISIT_REQUEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."NotificationAction" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "action" "public"."NotificationAction" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_staffId_isRead_idx" ON "public"."Notification"("staffId", "isRead");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
