-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `user_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `sessions_user_id_idx` ON `sessions`(`user_id`);

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
