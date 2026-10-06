-- AlterTable
ALTER TABLE `boards` ADD COLUMN `restored_by_admin_count` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `hidden_by_handler` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hidden_reason` ENUM('FLAGS', 'HANDLER_FLAG', 'ADMIN_REMOVED') NULL,
    ADD COLUMN `removed_at` DATETIME(3) NULL,
    MODIFY `ip_hash` CHAR(64) NULL;

-- CreateTable
CREATE TABLE `flags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target_type` ENUM('REPORT', 'BOARD') NOT NULL,
    `target_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `reason` ENUM('SEXUAL', 'VIOLENCE', 'HATE', 'PERSONAL_ATTACK', 'SPAM', 'NOT_COMPLAINT', 'FAKE_BOARD', 'SYSTEM_NSFW') NOT NULL,
    `note` VARCHAR(500) NULL,
    `status` ENUM('OPEN', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `weight` DOUBLE NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    INDEX `flags_target_type_target_id_status_idx`(`target_type`, `target_id`, `status`),
    INDEX `flags_status_reason_idx`(`status`, `reason`),
    INDEX `flags_user_id_created_at_idx`(`user_id`, `created_at`),
    UNIQUE INDEX `flags_target_type_target_id_user_id_key`(`target_type`, `target_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target_type` ENUM('USER', 'GUEST_TOKEN', 'IP') NOT NULL,
    `target_value` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,

    INDEX `bans_target_type_target_value_idx`(`target_type`, `target_value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_user_id` INTEGER NULL,
    `action` VARCHAR(60) NOT NULL,
    `target_type` VARCHAR(30) NULL,
    `target_id` INTEGER NULL,
    `data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    INDEX `audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flags` ADD CONSTRAINT `flags_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bans` ADD CONSTRAINT `bans_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
