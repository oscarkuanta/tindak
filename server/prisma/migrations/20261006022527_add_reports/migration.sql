-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `guest_token_hash` CHAR(64) NULL,
    `ip_hash` CHAR(64) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `location_detail` VARCHAR(200) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'DANGEROUS') NOT NULL,
    `status` ENUM('NEW', 'NEED_INFO', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'RESOLVED', 'REOPENED', 'REJECTED', 'DUPLICATE') NOT NULL DEFAULT 'NEW',
    `tracking_code` CHAR(8) NOT NULL,
    `tracking_secret_hash` CHAR(64) NOT NULL,
    `parent_id` INTEGER NULL,
    `assignee_id` INTEGER NULL,
    `priority_score` INTEGER NOT NULL DEFAULT 0,
    `reopen_count` INTEGER NOT NULL DEFAULT 0,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `needs_moderation` BOOLEAN NOT NULL DEFAULT false,
    `due_at` DATETIME(3) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reports_tracking_code_key`(`tracking_code`),
    INDEX `reports_board_id_is_hidden_created_at_idx`(`board_id`, `is_hidden`, `created_at`),
    INDEX `reports_board_id_status_idx`(`board_id`, `status`),
    INDEX `reports_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `reports_guest_token_hash_created_at_idx`(`guest_token_hash`, `created_at`),
    INDEX `reports_ip_hash_created_at_idx`(`ip_hash`, `created_at`),
    INDEX `reports_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `storage_key` VARCHAR(200) NOT NULL,
    `kind` ENUM('BEFORE', 'AFTER', 'EXTRA') NOT NULL DEFAULT 'BEFORE',
    `nsfw_score` DOUBLE NULL,
    `is_blurred` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_media_report_id_idx`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `from_status` ENUM('NEW', 'NEED_INFO', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'RESOLVED', 'REOPENED', 'REJECTED', 'DUPLICATE') NULL,
    `to_status` ENUM('NEW', 'NEED_INFO', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'RESOLVED', 'REOPENED', 'REJECTED', 'DUPLICATE') NOT NULL,
    `actor_type` ENUM('REPORTER', 'HANDLER', 'SYSTEM') NOT NULL,
    `actor_id` INTEGER NULL,
    `reason` VARCHAR(40) NULL,
    `note` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_events_report_id_created_at_idx`(`report_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `reports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_media` ADD CONSTRAINT `report_media_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_events` ADD CONSTRAINT `report_events_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_events` ADD CONSTRAINT `report_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
