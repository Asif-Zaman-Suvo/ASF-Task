-- CreateIndex
CREATE INDEX "ServiceRequest_statusRank_updatedAt_idx" ON "ServiceRequest"("statusRank", "updatedAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_priorityRank_updatedAt_idx" ON "ServiceRequest"("priorityRank", "updatedAt");
