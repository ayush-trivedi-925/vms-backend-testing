-- CreateEnum
CREATE TYPE "public"."AccountStatusEnum" AS ENUM ('Active', 'Disabled');

-- AlterTable
ALTER TABLE "public"."UserCredential" ADD COLUMN     "AccountStatus" "public"."AccountStatusEnum" NOT NULL DEFAULT 'Active';
