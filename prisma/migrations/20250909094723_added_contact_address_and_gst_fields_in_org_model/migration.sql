/*
  Warnings:

  - Added the required column `Address` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ContactNumber` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "Address" TEXT NOT NULL,
ADD COLUMN     "ContactNumber" TEXT NOT NULL,
ADD COLUMN     "GST" TEXT;
