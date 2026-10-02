-- DropIndex
DROP INDEX "Report_reporterId_companyId_key";

-- DropIndex
DROP INDEX "Report_reporterId_jobId_key";

-- DropIndex
DROP INDEX "Report_reporterId_commentId_key";

-- DropIndex
DROP INDEX "Report_reporterId_postId_key";

-- DropIndex
DROP INDEX "Report_reporterId_reviewId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Report_pending_reviewId" ON "Report"("reporterId", "reviewId") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Report_pending_postId" ON "Report"("reporterId", "postId") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Report_pending_commentId" ON "Report"("reporterId", "commentId") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Report_pending_jobId" ON "Report"("reporterId", "jobId") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Report_pending_companyId" ON "Report"("reporterId", "companyId") WHERE "status" = 'PENDING';
