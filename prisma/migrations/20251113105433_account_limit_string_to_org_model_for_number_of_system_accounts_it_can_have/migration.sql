-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "accountLimit" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "public"."SystemCredential" ALTER COLUMN "secretCode" DROP NOT NULL;
