-- AlterTable
ALTER TABLE "Company" ADD COLUMN "googlePlaceId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "dailyAllowance" INTEGER,
    "hasAccommodation" BOOLEAN NOT NULL DEFAULT false,
    "hasTransport" BOOLEAN NOT NULL DEFAULT false,
    "workStartTime" TEXT,
    "workEndTime" TEXT,
    "scoreWork" REAL NOT NULL,
    "scoreEnv" REAL NOT NULL,
    "scoreMentor" REAL NOT NULL,
    "scoreWelfare" REAL NOT NULL,
    "scoreOverall" REAL NOT NULL,
    "textWork" TEXT NOT NULL,
    "textPros" TEXT,
    "textCons" TEXT,
    "textAdvice" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("companyId", "createdAt", "dailyAllowance", "department", "gender", "hasAccommodation", "hasTransport", "id", "isAnonymous", "periodEnd", "periodStart", "rejectionReason", "scoreEnv", "scoreMentor", "scoreOverall", "scoreWelfare", "scoreWork", "status", "textAdvice", "textCons", "textPros", "textWork", "updatedAt", "userId", "workEndTime", "workStartTime") SELECT "companyId", "createdAt", "dailyAllowance", "department", "gender", "hasAccommodation", "hasTransport", "id", "isAnonymous", "periodEnd", "periodStart", "rejectionReason", "scoreEnv", "scoreMentor", "scoreOverall", "scoreWelfare", "scoreWork", "status", "textAdvice", "textCons", "textPros", "textWork", "updatedAt", "userId", "workEndTime", "workStartTime" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE INDEX "Review_status_department_idx" ON "Review"("status", "department");
CREATE INDEX "Review_status_companyId_idx" ON "Review"("status", "companyId");
CREATE UNIQUE INDEX "Review_companyId_userId_key" ON "Review"("companyId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Company_googlePlaceId_key" ON "Company"("googlePlaceId");
