-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "adminId", "createdAt", "detail", "id", "targetId", "targetType") SELECT "action", "adminId", "createdAt", "detail", "id", "targetId", "targetType" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE TABLE "new_Employer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "departments" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Employer" ("companyName", "contactEmail", "createdAt", "departments", "id", "phone", "userId") SELECT "companyName", "contactEmail", "createdAt", "departments", "id", "phone", "userId" FROM "Employer";
DROP TABLE "Employer";
ALTER TABLE "new_Employer" RENAME TO "Employer";
CREATE UNIQUE INDEX "Employer_userId_key" ON "Employer"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_reviewId_key" ON "Report"("reporterId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_postId_key" ON "Report"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_commentId_key" ON "Report"("reporterId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_jobId_key" ON "Report"("reporterId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_companyId_key" ON "Report"("reporterId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "UpgradeRequest_one_pending" ON "UpgradeRequest"("userId") WHERE "status" = 'PENDING';
