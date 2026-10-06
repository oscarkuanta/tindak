INSERT INTO `flags` (`target_type`, `target_id`, `user_id`, `reason`, `note`, `status`, `weight`, `created_at`)
SELECT 'REPORT', `id`, NULL, 'SYSTEM_NSFW', 'Foto diburamkan oleh pemindai otomatis', 'OPEN', 0, `created_at`
FROM `reports`
WHERE `needs_moderation` = 1
  AND NOT EXISTS (
    SELECT 1 FROM `flags` f
    WHERE f.`target_type` = 'REPORT' AND f.`target_id` = `reports`.`id` AND f.`reason` = 'SYSTEM_NSFW'
  );
