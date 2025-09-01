-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "systemId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."SystemCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
