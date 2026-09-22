-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('draft', 'active', 'archived');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "athleteId" UUID,
ADD COLUMN     "coachId" UUID,
ADD COLUMN     "status" "ProgramStatus" NOT NULL DEFAULT 'active';

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
