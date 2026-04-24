-- Create database
CREATE DATABASE IF NOT EXISTS school_management_system;
USE school_management_system;

-- Create tables (Sequelize will create these, but for reference)
-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `phone` VARCHAR(15) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'teacher', 'student', 'parent', 'principal') NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_email_approved` BOOLEAN DEFAULT FALSE,
  `last_login` DATETIME,
  `login_count` INT DEFAULT 0,
  `reset_password_token` VARCHAR(255),
  `reset_password_expires` DATETIME,
  `added_by` INT,
  `needs_password_change` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Insert admin user (replace hashes with actual ones from generate-hash.js)
INSERT INTO `users` (`name`, `email`, `username`, `phone`, `password`, `role`, `is_active`, `is_email_approved`, `needs_password_change`, `created_at`, `updated_at`) 
VALUES (
  'Super Admin', 
  'admin@school.com', 
  'admin', 
  '9999999999', 
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mr/.cZJ5kQvH5LQ5Q5Q5Q5Q5Q5Q5Q5', -- Replace with actual Admin@123 hash
  'admin', 
  1, 
  1, 
  0, 
  NOW(), 
  NOW()
);

-- Get the admin ID (assuming it's 1)
-- Insert teacher
INSERT INTO `users` (`name`, `email`, `username`, `phone`, `password`, `role`, `is_active`, `is_email_approved`, `needs_password_change`, `added_by`, `created_at`, `updated_at`) 
VALUES (
  'John Teacher', 
  'teacher@school.com', 
  'teacher_john', 
  '8888888888', 
  '$2a$10$L9qo8uLOickgx2ZMRZoMy.Mr/.cZJ5kQvH5LQ5Q5Q5Q5Q5Q5Q5Q5', -- Replace with actual Teacher@123 hash
  'teacher', 
  1, 
  1, 
  1, 
  1, 
  NOW(), 
  NOW()
);

-- Insert student
INSERT INTO `users` (`name`, `email`, `username`, `phone`, `password`, `role`, `is_active`, `is_email_approved`, `needs_password_change`, `added_by`, `created_at`, `updated_at`) 
VALUES (
  'Student One', 
  'student@school.com', 
  'student_one', 
  '7777777777', 
  '$2a$10$M9qo8uLOickgx2ZMRZoMy.Mr/.cZJ5kQvH5LQ5Q5Q5Q5Q5Q5Q5Q5', -- Replace with actual Student@123 hash
  'student', 
  1, 
  1, 
  1, 
  1, 
  NOW(), 
  NOW()
);

-- Insert parent
INSERT INTO `users` (`name`, `email`, `username`, `phone`, `password`, `role`, `is_active`, `is_email_approved`, `needs_password_change`, `added_by`, `created_at`, `updated_at`) 
VALUES (
  'Parent Name', 
  'parent@school.com', 
  'parent_one', 
  '6666666666', 
  '$2a$10$O9qo8uLOickgx2ZMRZoMy.Mr/.cZJ5kQvH5LQ5Q5Q5Q5Q5Q5Q5Q5', -- Replace with actual Parent@123 hash
  'parent', 
  1, 
  1, 
  1, 
  1, 
  NOW(), 
  NOW()
);

-- Now insert the profile data (students, teachers, parents tables will be created by Sequelize)