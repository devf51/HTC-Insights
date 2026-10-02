-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommunityComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CommunityComment" ("body", "createdAt", "id", "parentId", "postId", "rejectionReason", "status", "userId") SELECT "body", "createdAt", "id", "parentId", "postId", "rejectionReason", "status", "userId" FROM "CommunityComment";
DROP TABLE "CommunityComment";
ALTER TABLE "new_CommunityComment" RENAME TO "CommunityComment";
CREATE INDEX "CommunityComment_postId_status_idx" ON "CommunityComment"("postId", "status");
CREATE TABLE "new_CommunityPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "department" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bestAnswerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_bestAnswerId_fkey" FOREIGN KEY ("bestAnswerId") REFERENCES "CommunityComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommunityPost" ("body", "createdAt", "department", "id", "rejectionReason", "status", "title", "type", "userId") SELECT "body", "createdAt", "department", "id", "rejectionReason", "status", "title", "type", "userId" FROM "CommunityPost";
DROP TABLE "CommunityPost";
ALTER TABLE "new_CommunityPost" RENAME TO "CommunityPost";
CREATE UNIQUE INDEX "CommunityPost_bestAnswerId_key" ON "CommunityPost"("bestAnswerId");
CREATE INDEX "CommunityPost_status_type_department_idx" ON "CommunityPost"("status", "type", "department");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
