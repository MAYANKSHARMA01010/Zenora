-- Enums
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "DocumentType" AS ENUM ('LICENSE', 'ID_PROOF', 'DEGREE', 'CERTIFICATE', 'OTHER');

-- Therapist additions
ALTER TABLE "Therapist"
ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "hourlyRate" DOUBLE PRECISION;

-- Backfill verificationStatus from existing isVerified flag
UPDATE "Therapist" SET "verificationStatus" = 'APPROVED', "verifiedAt" = NOW() WHERE "isVerified" = true;

-- Indexes
CREATE INDEX "Therapist_verificationStatus_idx" ON "Therapist"("verificationStatus");
CREATE INDEX "Therapist_specialization_idx" ON "Therapist"("specialization");
CREATE INDEX "Therapist_rating_idx" ON "Therapist"("rating");

-- TherapistDocument table
CREATE TABLE "TherapistDocument" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TherapistDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TherapistDocument_therapistId_type_idx" ON "TherapistDocument"("therapistId", "type");

ALTER TABLE "TherapistDocument"
ADD CONSTRAINT "TherapistDocument_therapistId_fkey"
FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
