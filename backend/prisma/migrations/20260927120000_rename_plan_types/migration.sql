-- Planes nuevos: Gratis, Emprende, Crecimiento y Pro. El antiguo BUSINESS pasa a PRO.
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
CREATE TYPE "PlanType" AS ENUM ('FREE', 'EMPRENDE', 'CRECIMIENTO', 'PRO');
ALTER TABLE "Entrepreneur" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Entrepreneur" ALTER COLUMN "plan" TYPE "PlanType"
  USING (CASE "plan"::text WHEN 'BUSINESS' THEN 'PRO' ELSE "plan"::text END)::"PlanType";
ALTER TABLE "Entrepreneur" ALTER COLUMN "plan" SET DEFAULT 'FREE';
DROP TYPE "PlanType_old";
