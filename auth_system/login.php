<?php
// File: AUTH_SYSTEM/login.php

header("Content-Type: application/json"); // Set FIRST
require_once 'db.php'; // Use require_once

// Check if $conn exists from db.php
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available."]);
    exit;
}

// Check for POST request
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["success" => false, "message" => "Invalid request method! Expected POST."]);
    exit;
}

// Get user input
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? trim($_POST['password']) : '';

// Validate inputs
if (empty($username) || empty($password)) {
    http_response_code(400); // Bad Request
    echo json_encode(["success" => false, "message" => "Username and password are required!"]);
    exit;
}

// Check if user exists and verify password
try {
    // Select specific fields needed, use named placeholder
    $sql = "SELECT id, username, password FROM users WHERE username = :username";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':username', $username); // Bind parameter
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC); // Fetch one row

    // Verify password using password_verify
    if ($user && password_verify($password, $user['password'])) {
        // Login successful
        echo json_encode(["success" => true, "redirect" => "/auth_system/MovieDBWebsite/home.html"]);
    } else {
        // Invalid credentials (user not found OR password mismatch)
        http_response_code(401); // Unauthorized
        echo json_encode(["success" => false, "message" => "Invalid username or password!"]);
    }
} catch (PDOException $e) {
    // --- Catch potential DB errors during login query ---
    http_response_code(500); // Internal Server Error
    error_log("Login Error: " . $e->getMessage()); // Log the specific error server-side
    echo json_encode(["success" => false, "message" => "Database error during login. Please try again later."]);
    exit; // Explicit exit after error
}
?>