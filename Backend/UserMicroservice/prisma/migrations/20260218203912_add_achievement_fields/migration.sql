/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `achievements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,achievement_id]` on the table `user_achievements` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '🏆',
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_progress" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "image_url" SET DEFAULT '';

-- AlterTable
ALTER TABLE "user_achievements" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unlocked_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");
