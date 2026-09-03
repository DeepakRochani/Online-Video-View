-- Wedding Video Gallery Platform Schema
-- MySQL 8.0+ Compatible

CREATE DATABASE IF NOT EXISTS `wedding_gallery` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `wedding_gallery`;

-- 1. Photographers / Admin Users
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `google_account_id` VARCHAR(255) NULL,
    `avatar` VARCHAR(500) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Wedding Projects
CREATE TABLE IF NOT EXISTS `weddings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `couple_name` VARCHAR(255) NOT NULL,
    `wedding_date` DATE NOT NULL,
    `package_name` VARCHAR(255) NOT NULL DEFAULT 'Full Wedding Cinema',
    `cover_image` MEDIUMTEXT NULL,
    `welcome_message` TEXT NULL,
    `status` ENUM('active', 'private', 'archived') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_weddings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Google Drive Connections (Stores Photographer's Encrypted OAuth Tokens)
CREATE TABLE IF NOT EXISTS `drive_connections` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `wedding_id` INT UNSIGNED NOT NULL UNIQUE,
    `folder_id` VARCHAR(255) NOT NULL,
    `folder_name` VARCHAR(255) NOT NULL,
    `access_token_encrypted` TEXT NULL,
    `refresh_token_encrypted` TEXT NULL,
    `token_expires_at` DATETIME NULL,
    `resource_key` VARCHAR(255) NULL,
    `status` ENUM('connected', 'error', 'expired') DEFAULT 'connected',
    `last_synced_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_drive_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_drive_wedding` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Event Subfolders (Haldi, Mehndi, Sangeet, Wedding, Reception, etc.)
CREATE TABLE IF NOT EXISTS `events` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `wedding_id` INT UNSIGNED NOT NULL,
    `drive_folder_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `parent_folder_id` VARCHAR(255) NULL,
    `sort_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_events_wedding` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE,
    INDEX `idx_wedding_event` (`wedding_id`, `drive_folder_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Video Metadata Records (NO video binaries stored - metadata only)
CREATE TABLE IF NOT EXISTS `videos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `wedding_id` INT UNSIGNED NOT NULL,
    `event_id` INT UNSIGNED NULL,
    `drive_file_id` VARCHAR(255) NOT NULL UNIQUE,
    `drive_folder_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'video/mp4',
    `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `thumbnail_url` VARCHAR(1000) NULL,
    `web_view_url` VARCHAR(1000) NULL,
    `created_time` DATETIME NULL,
    `modified_time` DATETIME NULL,
    `duration` VARCHAR(50) NULL,
    `status` ENUM('ready', 'processing', 'error') DEFAULT 'ready',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_videos_wedding` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_videos_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL,
    INDEX `idx_drive_file` (`drive_file_id`),
    INDEX `idx_wedding_videos` (`wedding_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Client Galleries & Secure Access Tokens
CREATE TABLE IF NOT EXISTS `client_galleries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `wedding_id` INT UNSIGNED NOT NULL UNIQUE,
    `secure_token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `gallery_code` VARCHAR(16) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `password_enabled` TINYINT(1) DEFAULT 0,
    `allow_download` TINYINT(1) DEFAULT 1,
    `allow_fullscreen` TINYINT(1) DEFAULT 1,
    `show_branding` TINYINT(1) DEFAULT 1,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_client_galleries_wedding` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE,
    INDEX `idx_gallery_code` (`gallery_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Photographer Branding Settings
CREATE TABLE IF NOT EXISTS `gallery_settings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `wedding_id` INT UNSIGNED NOT NULL UNIQUE,
    `business_name` VARCHAR(255) NOT NULL DEFAULT 'DR Films Wedding Cinema',
    `logo` VARCHAR(500) NULL,
    `website` VARCHAR(255) NULL,
    `instagram` VARCHAR(255) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `primary_color` VARCHAR(20) DEFAULT '#D4AF37',
    `footer_text` VARCHAR(500) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_gallery_settings_wedding` FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Client Sessions
CREATE TABLE IF NOT EXISTS `client_sessions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `gallery_id` INT UNSIGNED NOT NULL,
    `session_token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_client_sessions_gallery` FOREIGN KEY (`gallery_id`) REFERENCES `client_galleries`(`id`) ON DELETE CASCADE,
    INDEX `idx_session_token` (`session_token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
