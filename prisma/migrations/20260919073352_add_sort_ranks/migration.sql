-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "priorityRank" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "statusRank" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServiceRequest" ("assigneeId", "categoryId", "createdAt", "description", "id", "number", "priority", "requesterId", "status", "title", "updatedAt") SELECT "assigneeId", "categoryId", "createdAt", "description", "id", "number", "priority", "requesterId", "status", "title", "updatedAt" FROM "ServiceRequest";
DROP TABLE "ServiceRequest";
ALTER TABLE "new_ServiceRequest" RENAME TO "ServiceRequest";
CREATE UNIQUE INDEX "ServiceRequest_number_key" ON "ServiceRequest"("number");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");
CREATE INDEX "ServiceRequest_priority_idx" ON "ServiceRequest"("priority");
CREATE INDEX "ServiceRequest_categoryId_idx" ON "ServiceRequest"("categoryId");
CREATE INDEX "ServiceRequest_assigneeId_idx" ON "ServiceRequest"("assigneeId");
CREATE INDEX "ServiceRequest_updatedAt_idx" ON "ServiceRequest"("updatedAt");
CREATE INDEX "ServiceRequest_number_idx" ON "ServiceRequest"("number");
CREATE INDEX "ServiceRequest_status_updatedAt_idx" ON "ServiceRequest"("status", "updatedAt");
CREATE INDEX "ServiceRequest_priority_updatedAt_idx" ON "ServiceRequest"("priority", "updatedAt");
CREATE INDEX "ServiceRequest_assigneeId_updatedAt_idx" ON "ServiceRequest"("assigneeId", "updatedAt");
CREATE INDEX "ServiceRequest_categoryId_updatedAt_idx" ON "ServiceRequest"("categoryId", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill rank columns from enum text so ranked sorting works on existing rows.
UPDATE "ServiceRequest" SET "priorityRank" = CASE "priority"
  WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'URGENT' THEN 4
  ELSE 0 END;
UPDATE "ServiceRequest" SET "statusRank" = CASE "status"
  WHEN 'PENDING' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'RESOLVED' THEN 3 WHEN 'CLOSED' THEN 4
  ELSE 0 END;
