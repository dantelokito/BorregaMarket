-- CreateIndex
CREATE INDEX "providers_city_idx" ON "providers"("city");

-- CreateIndex
CREATE INDEX "providers_business_name_idx" ON "providers"("business_name");

-- CreateIndex
CREATE INDEX "providers_is_active_is_verified_idx" ON "providers"("is_active", "is_verified");
