/*
  Warnings:

  - You are about to drop the column `orgEmail` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `orgName` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `authId` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `visitorEmail` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `visitorFirstName` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `visitorLastName` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `visitorOrg` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the `AuthCredential` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StaffMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Visit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Visit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationName` to the `Visit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffId` to the `Visit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."AuthCredential" DROP CONSTRAINT "AuthCredential_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RefreshToken" DROP CONSTRAINT "RefreshToken_authId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StaffMember" DROP CONSTRAINT "StaffMember_authId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StaffMember" DROP CONSTRAINT "StaffMember_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Visit" DROP CONSTRAINT "Visit_memberId_fkey";

-- DropIndex
DROP INDEX "public"."Organization_orgEmail_key";

-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "orgEmail",
DROP COLUMN "orgName",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."RefreshToken" DROP COLUMN "authId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Visit" DROP COLUMN "memberId",
DROP COLUMN "visitorEmail",
DROP COLUMN "visitorFirstName",
DROP COLUMN "visitorLastName",
DROP COLUMN "visitorOrg",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "organizationName" TEXT NOT NULL,
ADD COLUMN     "staffId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."AuthCredential";

-- DropTable
DROP TABLE "public"."StaffMember";

-- CreateTable
CREATE TABLE "public"."Staff" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" "public"."MemberRoleEnum" NOT NULL DEFAULT 'Staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCredential" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."AuthRoleEnum" NOT NULL,
    "firstTimeLogin" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "public"."Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "public"."Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_email_key" ON "public"."UserCredential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_email_key" ON "public"."Organization"("email");

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCredential" ADD CONSTRAINT "UserCredential_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
