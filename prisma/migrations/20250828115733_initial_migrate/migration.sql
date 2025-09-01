/*
  Warnings:

  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Meeting` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `role` on the `AuthCredential` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."AuthRoleEnum" AS ENUM ('Root', 'SuperAdmin', 'Admin');

-- CreateEnum
CREATE TYPE "public"."MemberRoleEnum" AS ENUM ('SuperAdmin', 'Admin', 'Staff');

-- DropForeignKey
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Meeting" DROP CONSTRAINT "Meeting_hostId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Meeting" DROP CONSTRAINT "Meeting_orgId_fkey";

-- AlterTable
ALTER TABLE "public"."AuthCredential" ALTER COLUMN "orgId" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "public"."AuthRoleEnum" NOT NULL;

-- DropTable
DROP TABLE "public"."Employee";

-- DropTable
DROP TABLE "public"."Meeting";

-- DropEnum
DROP TYPE "public"."RoleEnum";

-- CreateTable
CREATE TABLE "public"."Visit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "visitorFirstName" TEXT NOT NULL,
    "visitorLastName" TEXT NOT NULL,
    "visitorOrg" TEXT NOT NULL,
    "visitorEmail" TEXT NOT NULL,
    "reasonOfVisit" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" "public"."MeetingStatus" NOT NULL DEFAULT 'ONGOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StaffMember" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "authId" TEXT,
    "memberName" TEXT NOT NULL,
    "memberEmail" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "memberRole" "public"."MemberRoleEnum" NOT NULL DEFAULT 'Staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemCredential" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "SystemCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_authId_key" ON "public"."StaffMember"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_memberEmail_key" ON "public"."StaffMember"("memberEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SystemCredential_email_key" ON "public"."SystemCredential"("email");

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_authId_fkey" FOREIGN KEY ("authId") REFERENCES "public"."AuthCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SystemCredential" ADD CONSTRAINT "SystemCredential_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
