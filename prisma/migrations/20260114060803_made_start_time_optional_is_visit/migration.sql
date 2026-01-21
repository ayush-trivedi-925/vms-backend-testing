-- AlterTable
ALTER TABLE "public"."Visit" ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "startTime" DROP DEFAULT;
