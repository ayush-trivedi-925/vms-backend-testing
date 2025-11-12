-- CreateEnum
CREATE TYPE "public"."LoginStatus" AS ENUM ('LoggedIn', 'LoggedOut');

-- AlterTable
ALTER TABLE "public"."SystemCredential" ADD COLUMN     "activityStatus" "public"."LoginStatus" NOT NULL DEFAULT 'LoggedOut';
