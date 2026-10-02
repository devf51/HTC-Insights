-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_open_per_department" ON "JobPosting"("employerId", "department") WHERE "isActive" = 1 AND "status" <> 'REJECTED';
