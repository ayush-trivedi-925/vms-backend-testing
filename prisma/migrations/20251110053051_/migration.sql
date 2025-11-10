/*
  Warnings:

  - Made the column `secretCode` on table `SystemCredential` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."SystemCredential" ALTER COLUMN "secretCode" SET NOT NULL;
