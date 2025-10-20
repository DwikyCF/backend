-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 20, 2025 at 02:59 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `salon_management`
--

DELIMITER $$
--
-- Procedures
--
CREATE PROCEDURE `update_loyalty_points` (IN `p_customer_id` INT, IN `p_transaction_id` INT, IN `p_amount` DECIMAL(10,2))   BEGIN
    DECLARE points_earned INT;
    SET points_earned = FLOOR(p_amount / 10000);
    
    UPDATE customers 
    SET loyalty_points = loyalty_points + points_earned
    WHERE id = p_customer_id;
    
    INSERT INTO loyalty_transactions (customer_id, transaction_id, points_change, type, description)
    VALUES (p_customer_id, p_transaction_id, points_earned, 'earn', 'Earned from transaction');
END$$

CREATE PROCEDURE `update_stylist_rating` (IN `p_stylist_id` INT)   BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    DECLARE review_count INT;
    
    SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews
    WHERE stylist_id = p_stylist_id AND is_approved = TRUE;
    
    UPDATE stylists
    SET rating = IFNULL(avg_rating, 0),
        total_reviews = review_count
    WHERE id = p_stylist_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `stylist_id` int(11) DEFAULT NULL,
  `booking_date` date NOT NULL,
  `booking_time` time NOT NULL,
  `end_time` time DEFAULT NULL,
  `status` enum('pending','confirmed','in_progress','completed','cancelled','no_show') DEFAULT 'pending',
  `total_price` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `customer_id`, `stylist_id`, `booking_date`, `booking_time`, `end_time`, `status`, `total_price`, `notes`, `cancellation_reason`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, '2025-10-18', '09:00:00', '09:45:00', 'cancelled', 75000.00, NULL, 'Cancelled by customer', '2025-10-18 10:15:23', '2025-10-18 10:15:54'),
(2, 1, NULL, '2025-10-19', '09:00:00', '10:15:00', 'confirmed', 125000.00, 'ganteng ', NULL, '2025-10-18 10:37:00', '2025-10-19 08:52:34'),
(3, 2, NULL, '2025-10-20', '09:00:00', '09:45:00', 'confirmed', 75000.00, 'bikin cantik ya mbak', NULL, '2025-10-19 08:36:16', '2025-10-19 08:58:49'),
(4, 2, NULL, '2025-10-21', '09:30:00', '10:15:00', 'pending', 75000.00, 'Yang cantik ya', NULL, '2025-10-19 08:40:49', '2025-10-19 08:40:49');

-- --------------------------------------------------------

--
-- Table structure for table `booking_services`
--

CREATE TABLE `booking_services` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_services`
--

INSERT INTO `booking_services` (`id`, `booking_id`, `service_id`, `price`, `created_at`) VALUES
(1, 1, 1, 75000.00, '2025-10-18 10:15:23'),
(2, 2, 1, 75000.00, '2025-10-18 10:37:00'),
(3, 2, 2, 50000.00, '2025-10-18 10:37:00'),
(4, 3, 1, 75000.00, '2025-10-19 08:36:16'),
(5, 4, 1, 75000.00, '2025-10-19 08:40:49');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `address` text DEFAULT NULL,
  `loyalty_points` int(11) DEFAULT 0,
  `membership_tier` enum('bronze','silver','gold','platinum') DEFAULT 'bronze',
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `preferences` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `user_id`, `address`, `loyalty_points`, `membership_tier`, `date_of_birth`, `gender`, `preferences`, `created_at`, `updated_at`) VALUES
(1, 5, NULL, 0, 'bronze', NULL, NULL, NULL, '2025-10-18 10:08:09', '2025-10-18 10:08:09'),
(2, 6, NULL, 0, 'bronze', NULL, NULL, NULL, '2025-10-19 08:33:59', '2025-10-19 08:33:59');

-- --------------------------------------------------------

--
-- Table structure for table `loyalty_transactions`
--

CREATE TABLE `loyalty_transactions` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `points_change` int(11) NOT NULL COMMENT 'positive for earning, negative for redemption',
  `type` enum('earn','redeem','adjustment') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('booking','payment','promotion','review','general') DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_services`
--

CREATE TABLE `package_services` (
  `id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `min_stock` int(11) DEFAULT 10,
  `category` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_sales`
--

CREATE TABLE `product_sales` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `sold_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `product_sales`
--
DELIMITER $$
CREATE TRIGGER `after_product_sale` AFTER INSERT ON `product_sales` FOR EACH ROW BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `stylist_id` int(11) DEFAULT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `comment` text DEFAULT NULL,
  `images` text DEFAULT NULL COMMENT 'JSON array of image URLs',
  `is_approved` tinyint(1) DEFAULT 1,
  `is_visible` tinyint(1) DEFAULT 1,
  `admin_reply` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `reviews`
--
DELIMITER $$
CREATE TRIGGER `after_review_insert` AFTER INSERT ON `reviews` FOR EACH ROW BEGIN
    IF NEW.stylist_id IS NOT NULL THEN
        CALL update_stylist_rating(NEW.stylist_id);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `salon_closed_days`
--

CREATE TABLE `salon_closed_days` (
  `id` int(11) NOT NULL,
  `closed_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salon_gallery`
--

CREATE TABLE `salon_gallery` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salon_settings`
--

CREATE TABLE `salon_settings` (
  `id` int(11) NOT NULL,
  `salon_name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `opening_time` time DEFAULT NULL,
  `closing_time` time DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Jakarta',
  `currency` varchar(10) DEFAULT 'IDR',
  `tax_percentage` decimal(5,2) DEFAULT 0.00,
  `booking_advance_days` int(11) DEFAULT 30,
  `cancellation_hours` int(11) DEFAULT 24,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `salon_settings`
--

INSERT INTO `salon_settings` (`id`, `salon_name`, `address`, `phone`, `email`, `website`, `description`, `logo`, `opening_time`, `closing_time`, `timezone`, `currency`, `tax_percentage`, `booking_advance_days`, `cancellation_hours`, `created_at`, `updated_at`) VALUES
(1, 'Beauty Salon', 'Jl. Contoh No. 123, Jakarta', '021-12345678', 'info@beautysalon.com', NULL, NULL, NULL, '09:00:00', '21:00:00', 'Asia/Jakarta', 'IDR', 0.00, 30, 24, '2025-10-18 06:53:38', '2025-10-18 06:53:38');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration` int(11) NOT NULL COMMENT 'in minutes',
  `image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_popular` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `category_id`, `name`, `description`, `price`, `duration`, `image`, `is_active`, `is_popular`, `created_at`, `updated_at`) VALUES
(1, 1, 'Hair Cut', 'Potong rambut dengan style modern', 75000.00, 45, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(2, 1, 'Hair Wash & Blow', 'Cuci dan blow rambut', 50000.00, 30, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(3, 1, 'Hair Treatment', 'Perawatan rambut intensif', 150000.00, 60, NULL, 1, 0, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(4, 2, 'Hair Coloring', 'Pewarnaan rambut full', 300000.00, 120, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(5, 2, 'Highlights', 'Pewarnaan highlights', 250000.00, 90, NULL, 1, 0, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(6, 3, 'Basic Facial', 'Facial dasar untuk semua jenis kulit', 100000.00, 60, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(7, 3, 'Acne Facial', 'Facial untuk kulit berjerawat', 150000.00, 75, NULL, 1, 0, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(8, 4, 'Manicure', 'Perawatan kuku tangan', 75000.00, 45, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(9, 4, 'Pedicure', 'Perawatan kuku kaki', 85000.00, 60, NULL, 1, 0, '2025-10-18 06:54:50', '2025-10-18 06:54:50'),
(10, 5, 'Party Makeup', 'Makeup untuk acara pesta', 250000.00, 90, NULL, 1, 1, '2025-10-18 06:54:50', '2025-10-18 06:54:50');

-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

CREATE TABLE `service_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_categories`
--

INSERT INTO `service_categories` (`id`, `name`, `description`, `icon`, `created_at`) VALUES
(1, 'Hair Care', 'Layanan perawatan rambut', 'scissors', '2025-10-18 06:54:15'),
(2, 'Hair Color', 'Layanan pewarnaan rambut', 'palette', '2025-10-18 06:54:15'),
(3, 'Facial', 'Perawatan wajah', 'sparkles', '2025-10-18 06:54:15'),
(4, 'Nail Care', 'Perawatan kuku', 'hand', '2025-10-18 06:54:15'),
(5, 'Makeup', 'Layanan tata rias', 'brush', '2025-10-18 06:54:15');

-- --------------------------------------------------------

--
-- Table structure for table `service_packages`
--

CREATE TABLE `service_packages` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `discount_percentage` int(11) DEFAULT 0,
  `final_price` decimal(10,2) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stylists`
--

CREATE TABLE `stylists` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `experience_years` int(11) DEFAULT 0,
  `is_available` tinyint(1) DEFAULT 1,
  `rating` decimal(3,2) DEFAULT 0.00,
  `total_reviews` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stylist_leaves`
--

CREATE TABLE `stylist_leaves` (
  `id` int(11) NOT NULL,
  `stylist_id` int(11) NOT NULL,
  `leave_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stylist_schedules`
--

CREATE TABLE `stylist_schedules` (
  `id` int(11) NOT NULL,
  `stylist_id` int(11) NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `transaction_code` varchar(50) NOT NULL,
  `payment_method` enum('cash','transfer','credit_card','debit_card','e_wallet') NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `amount` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `final_amount` decimal(10,2) NOT NULL,
  `voucher_code` varchar(50) DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `transactions`
--
DELIMITER $$
CREATE TRIGGER `after_transaction_paid` AFTER UPDATE ON `transactions` FOR EACH ROW BEGIN
    DECLARE v_customer_id INT;
    
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        SELECT customer_id INTO v_customer_id
        FROM bookings
        WHERE id = NEW.booking_id;
        
        CALL update_loyalty_points(v_customer_id, NEW.id, NEW.final_amount);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `role` enum('admin','customer','stylist') NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role`, `email`, `password`, `name`, `phone`, `avatar`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@salon.com', '$2a$10$QGP0F4JwKyu8c6QJN4yxEu40qqFNF.xML6DqBb0HD09y61pZQLIeq', 'Admin Salon', '081234567890', NULL, 1, '2025-10-18 06:53:52', '2025-10-18 08:23:11'),
(2, 'customer', 'dwiky@example.com', '$2a$10$pUxNmz5PwJMa/PpM2q1r7.twn5X6M/V6Mx3VGRYcTSAuSVuca5ffG', '', NULL, NULL, 1, '2025-10-18 08:31:55', '2025-10-18 08:31:55'),
(3, 'customer', 'christian@example.com', '$2a$10$L/jhts.VyYqcZmX08rBraOSR4ICZvvlbkY/4uB2ctGr8ghos9QN.S', '', NULL, NULL, 1, '2025-10-18 08:32:28', '2025-10-18 08:32:28'),
(4, 'customer', 'test@example.com', '$2a$10$B95CF2x3VThW/Uu4YDcpWeHSN27GfF5zJp4CCmPN0trnWOajmxTu.', '', NULL, NULL, 1, '2025-10-18 08:35:43', '2025-10-18 08:35:43'),
(5, 'customer', 'wahyu@test.com', '$2a$10$acPyhPBEjdrWeHqn2jR1yeVhB8GlbQxwO8VL.4G8CgZ9KQKgTbpii', '', NULL, NULL, 1, '2025-10-18 08:42:34', '2025-10-18 08:42:34'),
(6, 'customer', 'hetty@test.com', '$2a$10$vwcr.l5/RNxlCpH4yjPsweRy/D6YW5.dqEJKto5mTr9ncEoEVXVPS', 'Hetty Dolly', '08984200979', NULL, 1, '2025-10-19 08:33:59', '2025-10-19 08:33:59');

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_revenue`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_revenue` (
`transaction_date` date
,`total_transactions` bigint(21)
,`total_revenue` decimal(32,2)
,`avg_transaction` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_popular_services`
-- (See below for the actual view)
--
CREATE TABLE `view_popular_services` (
`id` int(11)
,`name` varchar(255)
,`category_id` int(11)
,`category_name` varchar(100)
,`booking_count` bigint(21)
,`total_revenue` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_stylist_performance`
-- (See below for the actual view)
--
CREATE TABLE `view_stylist_performance` (
`id` int(11)
,`name` varchar(255)
,`rating` decimal(3,2)
,`total_reviews` int(11)
,`total_bookings` bigint(21)
,`total_revenue` decimal(32,2)
,`avg_booking_value` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_purchase` decimal(10,2) DEFAULT 0.00,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `max_usage` int(11) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `valid_from` date NOT NULL,
  `valid_until` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_usage`
--

CREATE TABLE `voucher_usage` (
  `id` int(11) NOT NULL,
  `voucher_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `used_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_revenue`
--
DROP TABLE IF EXISTS `view_daily_revenue`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_daily_revenue`  AS SELECT cast(`t`.`created_at` as date) AS `transaction_date`, count(distinct `t`.`id`) AS `total_transactions`, sum(`t`.`final_amount`) AS `total_revenue`, avg(`t`.`final_amount`) AS `avg_transaction` FROM `transactions` AS `t` WHERE `t`.`payment_status` = 'paid' GROUP BY cast(`t`.`created_at` as date) ;

-- --------------------------------------------------------

--
-- Structure for view `view_popular_services`
--
DROP TABLE IF EXISTS `view_popular_services`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_popular_services`  AS SELECT `s`.`id` AS `id`, `s`.`name` AS `name`, `s`.`category_id` AS `category_id`, `sc`.`name` AS `category_name`, count(`bs`.`id`) AS `booking_count`, sum(`bs`.`price`) AS `total_revenue` FROM (((`services` `s` left join `service_categories` `sc` on(`s`.`category_id` = `sc`.`id`)) left join `booking_services` `bs` on(`s`.`id` = `bs`.`service_id`)) left join `bookings` `b` on(`bs`.`booking_id` = `b`.`id`)) WHERE `b`.`status` = 'completed' GROUP BY `s`.`id`, `s`.`name`, `s`.`category_id`, `sc`.`name` ORDER BY count(`bs`.`id`) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `view_stylist_performance`
--
DROP TABLE IF EXISTS `view_stylist_performance`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_stylist_performance`  AS SELECT `st`.`id` AS `id`, `u`.`name` AS `name`, `st`.`rating` AS `rating`, `st`.`total_reviews` AS `total_reviews`, count(distinct `b`.`id`) AS `total_bookings`, sum(`b`.`total_price`) AS `total_revenue`, avg(`b`.`total_price`) AS `avg_booking_value` FROM ((`stylists` `st` join `users` `u` on(`st`.`user_id` = `u`.`id`)) left join `bookings` `b` on(`st`.`id` = `b`.`stylist_id` and `b`.`status` = 'completed')) GROUP BY `st`.`id`, `u`.`name`, `st`.`rating`, `st`.`total_reviews` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_date` (`booking_date`),
  ADD KEY `idx_bookings_status` (`status`),
  ADD KEY `idx_bookings_customer` (`customer_id`),
  ADD KEY `idx_bookings_stylist` (`stylist_id`),
  ADD KEY `idx_bookings_customer_id` (`customer_id`),
  ADD KEY `idx_bookings_stylist_id` (`stylist_id`);

--
-- Indexes for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_user_id` (`user_id`);

--
-- Indexes for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `transaction_id` (`transaction_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`is_read`);

--
-- Indexes for table `package_services`
--
ALTER TABLE `package_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_id` (`package_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_sales`
--
ALTER TABLE `product_sales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `transaction_id` (`transaction_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `stylist_id` (`stylist_id`),
  ADD KEY `idx_reviews_rating` (`rating`),
  ADD KEY `idx_reviews_customer_id` (`customer_id`);

--
-- Indexes for table `salon_closed_days`
--
ALTER TABLE `salon_closed_days`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `salon_gallery`
--
ALTER TABLE `salon_gallery`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `salon_settings`
--
ALTER TABLE `salon_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_services_active` (`is_active`),
  ADD KEY `idx_services_category_id` (`category_id`);

--
-- Indexes for table `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `service_packages`
--
ALTER TABLE `service_packages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stylists`
--
ALTER TABLE `stylists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `stylist_leaves`
--
ALTER TABLE `stylist_leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stylist_id` (`stylist_id`);

--
-- Indexes for table `stylist_schedules`
--
ALTER TABLE `stylist_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stylist_id` (`stylist_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_code` (`transaction_code`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `idx_transactions_status` (`payment_status`),
  ADD KEY `idx_transactions_code` (`transaction_code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_vouchers_code` (`code`);

--
-- Indexes for table `voucher_usage`
--
ALTER TABLE `voucher_usage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `voucher_id` (`voucher_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `booking_services`
--
ALTER TABLE `booking_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `package_services`
--
ALTER TABLE `package_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_sales`
--
ALTER TABLE `product_sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salon_closed_days`
--
ALTER TABLE `salon_closed_days`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salon_gallery`
--
ALTER TABLE `salon_gallery`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salon_settings`
--
ALTER TABLE `salon_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `service_categories`
--
ALTER TABLE `service_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `service_packages`
--
ALTER TABLE `service_packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stylists`
--
ALTER TABLE `stylists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stylist_leaves`
--
ALTER TABLE `stylist_leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stylist_schedules`
--
ALTER TABLE `stylist_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_usage`
--
ALTER TABLE `voucher_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD CONSTRAINT `booking_services_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `booking_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD CONSTRAINT `loyalty_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `loyalty_transactions_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `package_services`
--
ALTER TABLE `package_services`
  ADD CONSTRAINT `package_services_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `service_packages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `package_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_sales`
--
ALTER TABLE `product_sales`
  ADD CONSTRAINT `product_sales_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_sales_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `stylists`
--
ALTER TABLE `stylists`
  ADD CONSTRAINT `stylists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stylist_leaves`
--
ALTER TABLE `stylist_leaves`
  ADD CONSTRAINT `stylist_leaves_ibfk_1` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stylist_schedules`
--
ALTER TABLE `stylist_schedules`
  ADD CONSTRAINT `stylist_schedules_ibfk_1` FOREIGN KEY (`stylist_id`) REFERENCES `stylists` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `voucher_usage`
--
ALTER TABLE `voucher_usage`
  ADD CONSTRAINT `voucher_usage_ibfk_1` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `voucher_usage_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `voucher_usage_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
