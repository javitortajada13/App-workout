-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('warmup', 'main', 'recovery');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('straight', 'superset', 'circuit', 'contrast_pair');

-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('reps', 'reps_per_side', 'distance', 'time');

-- CreateEnum
CREATE TYPE "ExerciseLinkType" AS ENUM ('progression', 'regression', 'variation', 'alternative');

-- CreateEnum
CREATE TYPE "Emphasis" AS ENUM ('primary', 'secondary');

-- CreateEnum
CREATE TYPE "EvidenceRating" AS ENUM ('strong', 'moderate', 'limited', 'conflicting', 'insufficient');

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "coachNote" TEXT,
    "sportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "SessionRole" NOT NULL DEFAULT 'main',
    "programId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "blockType" "BlockType" NOT NULL DEFAULT 'straight',
    "rounds" INTEGER,
    "purpose" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockExercise" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prescriptionType" "PrescriptionType" NOT NULL DEFAULT 'reps',
    "sets" INTEGER,
    "repsOrDuration" TEXT NOT NULL,
    "load" TEXT,
    "tempo" TEXT,
    "rest" TEXT,
    "instanceNote" TEXT,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "BlockExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objective" TEXT NOT NULL,
    "description" TEXT,
    "movementComplexity" TEXT,
    "contraindications" TEXT,
    "coachingCues" TEXT,
    "evidenceRating" "EvidenceRating",
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalQuality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PhysicalQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExercisePhysicalQuality" (
    "exerciseId" TEXT NOT NULL,
    "qualityId" TEXT NOT NULL,
    "emphasis" "Emphasis" NOT NULL DEFAULT 'primary',

    CONSTRAINT "ExercisePhysicalQuality_pkey" PRIMARY KEY ("exerciseId","qualityId")
);

-- CreateTable
CREATE TABLE "Muscle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT,

    CONSTRAINT "Muscle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseMuscle" (
    "exerciseId" TEXT NOT NULL,
    "muscleId" TEXT NOT NULL,
    "emphasis" "Emphasis" NOT NULL DEFAULT 'primary',

    CONSTRAINT "ExerciseMuscle_pkey" PRIMARY KEY ("exerciseId","muscleId")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseEquipment" (
    "exerciseId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExerciseEquipment_pkey" PRIMARY KEY ("exerciseId","equipmentId")
);

-- CreateTable
CREATE TABLE "ExerciseLink" (
    "id" TEXT NOT NULL,
    "relationshipType" "ExerciseLinkType" NOT NULL,
    "rationale" TEXT,
    "fromExerciseId" TEXT NOT NULL,
    "toExerciseId" TEXT NOT NULL,

    CONSTRAINT "ExerciseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportTransfer" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceRating" "EvidenceRating" NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,

    CONSTRAINT "SportTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_programId_order_key" ON "Session"("programId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Block_sessionId_order_key" ON "Block"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BlockExercise_blockId_order_key" ON "BlockExercise"("blockId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalQuality_name_key" ON "PhysicalQuality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Muscle_name_key" ON "Muscle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_name_key" ON "Equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLink_fromExerciseId_toExerciseId_relationshipType_key" ON "ExerciseLink"("fromExerciseId", "toExerciseId", "relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "SportTransfer_exerciseId_sportId_key" ON "SportTransfer"("exerciseId", "sportId");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockExercise" ADD CONSTRAINT "BlockExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockExercise" ADD CONSTRAINT "BlockExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePhysicalQuality" ADD CONSTRAINT "ExercisePhysicalQuality_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePhysicalQuality" ADD CONSTRAINT "ExercisePhysicalQuality_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "PhysicalQuality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseMuscle" ADD CONSTRAINT "ExerciseMuscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseMuscle" ADD CONSTRAINT "ExerciseMuscle_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "Muscle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEquipment" ADD CONSTRAINT "ExerciseEquipment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEquipment" ADD CONSTRAINT "ExerciseEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLink" ADD CONSTRAINT "ExerciseLink_fromExerciseId_fkey" FOREIGN KEY ("fromExerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLink" ADD CONSTRAINT "ExerciseLink_toExerciseId_fkey" FOREIGN KEY ("toExerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTransfer" ADD CONSTRAINT "SportTransfer_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTransfer" ADD CONSTRAINT "SportTransfer_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
