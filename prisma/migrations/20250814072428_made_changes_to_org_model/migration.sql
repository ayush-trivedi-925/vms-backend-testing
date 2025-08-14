/*
  Warnings:

  - A unique constraint covering the columns `[orgEmail]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Organization_orgEmail_key" ON "public"."Organization"("orgEmail");
