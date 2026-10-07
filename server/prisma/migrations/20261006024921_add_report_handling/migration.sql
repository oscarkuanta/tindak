/*
  Warnings:

  - You are about to alter the column `reason` on the `report_events` table. The data in that column could be lost. The data in that column will be cast from `VarChar(40)` to `Enum(EnumId(13))`.

*/
-- AlterTable
ALTER TABLE `report_events` MODIFY `reason` ENUM('NOT_PHYSICAL', 'OUT_OF_SCOPE', 'INSUFFICIENT_INFORMATION', 'FALSE_REPORT', 'OTHER') NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `reporter_not_satisfied` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `info_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `report_id` INTEGER NOT NULL,
    `question` VARCHAR(1000) NOT NULL,
    `answer` VARCHAR(2000) NULL,
    `asked_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `answered_at` DATETIME(3) NULL,

    INDEX `info_requests_report_id_created_at_idx`(`report_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `info_requests` ADD CONSTRAINT `info_requests_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `info_requests` ADD CONSTRAINT `info_requests_asked_by_id_fkey` FOREIGN KEY (`asked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
