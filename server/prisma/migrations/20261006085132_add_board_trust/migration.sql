-- AlterTable
ALTER TABLE `boards` ADD COLUMN `candidate_since` DATETIME(3) NULL,
    ADD COLUMN `rating_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rating_sum` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rejected_rate` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `response_rate` DOUBLE NULL,
    ADD COLUMN `trust_label` ENUM('NEW', 'TRUSTED', 'NONE', 'CAUTION') NOT NULL DEFAULT 'NEW',
    ADD COLUMN `trust_score` DOUBLE NULL;

-- CreateTable
CREATE TABLE `board_ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `stars` TINYINT NOT NULL,
    `quick_tag` ENUM('RESPONSIVE', 'SLOW', 'DOUBTFUL') NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `board_ratings_user_id_idx`(`user_id`),
    UNIQUE INDEX `board_ratings_board_id_user_id_key`(`board_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `board_verification_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `action` ENUM('GRANTED', 'REVOKED', 'SKIPPED') NOT NULL,
    `actor_user_id` INTEGER NULL,
    `reason` VARCHAR(500) NULL,
    `snapshot` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `board_verification_logs_board_id_created_at_idx`(`board_id`, `created_at`),
    INDEX `board_verification_logs_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `boards_candidate_since_idx` ON `boards`(`candidate_since`);

-- CreateIndex
CREATE INDEX `boards_verification_trust_score_idx` ON `boards`(`verification`, `trust_score`);

-- AddForeignKey
ALTER TABLE `board_ratings` ADD CONSTRAINT `board_ratings_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_ratings` ADD CONSTRAINT `board_ratings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_verification_logs` ADD CONSTRAINT `board_verification_logs_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_verification_logs` ADD CONSTRAINT `board_verification_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
