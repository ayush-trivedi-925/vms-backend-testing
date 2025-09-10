/*
  Warnings:

  - You are about to drop the column `Address` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `ContactNumber` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `GST` on the `Organization` table. All the data in the column will be lost.
  - Added the required column `address` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactnumber` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "Address",
DROP COLUMN "ContactNumber",
DROP COLUMN "GST",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "contactnumber" TEXT NOT NULL,
ADD COLUMN     "gst" TEXT;
