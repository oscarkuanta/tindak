-- AlterTable
ALTER TABLE `reports` ADD COLUMN `annoying_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `dangerous_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `hot_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `last_engagement_at` DATETIME(3) NULL,
    ADD COLUMN `long_standing_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `support_count` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `supports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supports_report_id_created_at_idx`(`report_id`, `created_at`),
    INDEX `supports_user_id_idx`(`user_id`),
    UNIQUE INDEX `supports_report_id_user_id_key`(`report_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('DANGEROUS', 'LONG_STANDING', 'ANNOYING') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reactions_report_id_updated_at_idx`(`report_id`, `updated_at`),
    INDEX `reactions_user_id_idx`(`user_id`),
    UNIQUE INDEX `reactions_report_id_user_id_key`(`report_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `reports_board_id_is_hidden_hot_score_idx` ON `reports`(`board_id`, `is_hidden`, `hot_score`);

-- CreateIndex
CREATE INDEX `reports_board_id_is_hidden_priority_score_idx` ON `reports`(`board_id`, `is_hidden`, `priority_score`);

-- CreateIndex
CREATE INDEX `reports_is_hidden_hot_score_idx` ON `reports`(`is_hidden`, `hot_score`);

-- AddForeignKey
ALTER TABLE `supports` ADD CONSTRAINT `supports_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supports` ADD CONSTRAINT `supports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
