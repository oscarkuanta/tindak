-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('USER', 'ADMIN', 'BOARD_ADMIN') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `boards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `city` VARCHAR(80) NOT NULL,
    `type` ENUM('SCHOOL', 'CAMPUS', 'OFFICE', 'ROAD', 'AREA', 'PUBLIC_FACILITY', 'OTHER') NOT NULL,
    `manager_title` VARCHAR(80) NULL,
    `description` VARCHAR(1000) NOT NULL,
    `cover_image_url` VARCHAR(500) NULL,
    `verification` ENUM('COMMUNITY', 'OFFICIAL') NOT NULL DEFAULT 'COMMUNITY',
    `verified_at` DATETIME(3) NULL,
    `verified_by_id` INTEGER NULL,
    `dangerous_target_hours` INTEGER NOT NULL DEFAULT 48,
    `status` ENUM('ACTIVE', 'INACTIVE', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
    `last_handler_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `owner_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `boards_slug_key`(`slug`),
    INDEX `boards_name_idx`(`name`),
    INDEX `boards_city_idx`(`city`),
    INDEX `boards_city_type_idx`(`city`, `type`),
    INDEX `boards_verification_idx`(`verification`),
    INDEX `boards_owner_id_idx`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `board_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'HANDLER') NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE') NOT NULL,
    `invited_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `board_members_user_id_status_idx`(`user_id`, `status`),
    UNIQUE INDEX `board_members_board_id_user_id_key`(`board_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_id` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `categories_board_id_sort_order_idx`(`board_id`, `sort_order`),
    UNIQUE INDEX `categories_board_id_name_key`(`board_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `boards` ADD CONSTRAINT `boards_verified_by_id_fkey` FOREIGN KEY (`verified_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `boards` ADD CONSTRAINT `boards_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_members` ADD CONSTRAINT `board_members_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_members` ADD CONSTRAINT `board_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_members` ADD CONSTRAINT `board_members_invited_by_id_fkey` FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
