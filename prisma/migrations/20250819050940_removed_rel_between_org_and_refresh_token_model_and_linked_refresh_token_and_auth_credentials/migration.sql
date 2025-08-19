/*
  Warnings:

  - The `status` column on the `Meeting` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `orgId` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the `AuthCredentials` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[authId]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MeetingStatus" AS ENUM ('ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."RoleEnum" AS ENUM ('Admin', 'User');

-- DropForeignKey
ALTER TABLE "public"."AuthCredentials" DROP CONSTRAINT "AuthCredentials_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RefreshToken" DROP CONSTRAINT "RefreshToken_orgId_fkey";

-- DropIndex
DROP INDEX "public"."RefreshToken_orgId_key";

-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Meeting" DROP COLUMN "status",
ADD COLUMN     "status" "public"."MeetingStatus" NOT NULL DEFAULT 'ONGOING';

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."RefreshToken" DROP COLUMN "orgId",
ADD COLUMN     "authId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "public"."AuthCredentials";

-- DropEnum
DROP TYPE "public"."meetingStatus";

-- DropEnum
DROP TYPE "public"."roleEnum";

-- CreateTable
CREATE TABLE "public"."AuthCredential" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "public"."RoleEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthCredential_email_key" ON "public"."AuthCredential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_authId_key" ON "public"."RefreshToken"("authId");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthCredential" ADD CONSTRAINT "AuthCredential_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
