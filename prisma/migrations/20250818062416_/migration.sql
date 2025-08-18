-- AlterTable
ALTER TABLE "public"."Meeting" ADD COLUMN     "orgId" TEXT NOT NULL DEFAULT 'c94f055c-480e-49cb-9c9b-320b2865aee8';

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
