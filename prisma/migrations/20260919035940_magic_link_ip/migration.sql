-- AlterTable
ALTER TABLE "magic_link_tokens" ADD COLUMN     "ip" TEXT;

-- CreateIndex
CREATE INDEX "magic_link_tokens_ip_created_at_idx" ON "magic_link_tokens"("ip", "created_at");
