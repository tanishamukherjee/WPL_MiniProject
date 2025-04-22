<?php
// File: AUTH_SYSTEM/db.php

$host = "localhost";
$dbname = "auth_system";
$username = "root";
$password = "";
// --- !!! IMPORTANT: VERIFY THIS PORT IN YOUR XAMPP PANEL !!! ---
$port = "3306"; // Default XAMPP MySQL port. Change ONLY if XAMPP shows 3307 or other.

// --- CORS Headers ---
header('Content-Type: application/json'); // Set FIRST
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}
// --- End CORS Headers ---

// --- Enable FULL PHP error reporting during development ---
// Comment these out or set to 0 in production environments
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// ---- End Error Reporting ----

try {
    // --- Use the $port variable in the connection string ---
    $conn = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $username, $password);

    // Set PDO attributes for robust error handling and real prepared statements
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

} catch (PDOException $e) {
    // --- Output JSON on Connection Error ---
    http_response_code(500); // Internal Server Error status
    // Content-Type header was already set above
    echo json_encode([
        'success' => false,
        'message' => "Database connection failed: " . $e->getMessage() // Show specific error for debugging
    ]);
    exit; // Stop script if DB connection fails
    // --- End Error Handling ---
}

// $conn variable is now available to scripts that include this file via require_once
?>