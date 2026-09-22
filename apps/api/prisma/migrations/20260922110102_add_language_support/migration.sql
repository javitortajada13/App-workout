-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "purposeEn" TEXT;

-- AlterTable
ALTER TABLE "BlockExercise" ADD COLUMN     "instanceNoteEn" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "coachingCuesEn" TEXT,
ADD COLUMN     "contraindicationsEn" TEXT,
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "movementComplexityEn" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "objectiveEn" TEXT;

-- AlterTable
ALTER TABLE "ExerciseLink" ADD COLUMN     "rationaleEn" TEXT;

-- AlterTable
ALTER TABLE "Muscle" ADD COLUMN     "muscleGroupEn" TEXT,
ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "PhysicalQuality" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es';

-- AlterTable
ALTER TABLE "Sport" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "SportTransfer" ADD COLUMN     "descriptionEn" TEXT;
