/*
  Warnings:

  - The values [User] on the enum `RoleEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."RoleEnum_new" AS ENUM ('SuperAdmin', 'Admin');
ALTER TABLE "public"."AuthCredential" ALTER COLUMN "role" TYPE "public"."RoleEnum_new" USING ("role"::text::"public"."RoleEnum_new");
ALTER TYPE "public"."RoleEnum" RENAME TO "RoleEnum_old";
ALTER TYPE "public"."RoleEnum_new" RENAME TO "RoleEnum";
DROP TYPE "public"."RoleEnum_old";
COMMIT;
