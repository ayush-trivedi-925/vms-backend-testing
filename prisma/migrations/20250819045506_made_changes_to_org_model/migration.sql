/*
  Warnings:

  - You are about to drop the column `password` on the `Organization` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."roleEnum" AS ENUM ('Admin', 'User');

-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "password";

-- CreateTable
CREATE TABLE "public"."AuthCredentials" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "public"."roleEnum" NOT NULL,

    CONSTRAINT "AuthCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthCredentials_email_key" ON "public"."AuthCredentials"("email");

-- AddForeignKey
ALTER TABLE "public"."AuthCredentials" ADD CONSTRAINT "AuthCredentials_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
