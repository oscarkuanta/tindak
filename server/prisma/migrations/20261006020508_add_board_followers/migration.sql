-- CreateTable
CREATE TABLE `board_followers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `notify_level` ENUM('ALL', 'DANGEROUS_ONLY', 'OFF') NOT NULL DEFAULT 'ALL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `board_followers_user_id_created_at_idx`(`user_id`, `created_at`),
    UNIQUE INDEX `board_followers_board_id_user_id_key`(`board_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `board_followers` ADD CONSTRAINT `board_followers_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_followers` ADD CONSTRAINT `board_followers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
