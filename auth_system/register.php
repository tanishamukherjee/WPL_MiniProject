<?php
// File: AUTH_SYSTEM/register.php

header("Content-Type: application/json"); // Set FIRST
require_once 'db.php'; // Use require_once to prevent multiple includes

// Check if $conn was successfully created in db.php
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available."]);
    exit;
}

// Check request method
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["success" => false, "message" => "Invalid request method! Expected POST."]);
    exit;
}

// --- Get user input ---
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? trim($_POST['password']) : '';

// --- Basic Validation ---
if (empty($username) || empty($email) || empty($password)) {
    http_response_code(400); // Bad Request
    echo json_encode(["success" => false, "message" => "All fields (username, email, password) are required!"]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid email format!"]);
    exit;
}

// --- Check if username already exists ---
try {
    $sql_check = "SELECT id FROM users WHERE username = :username"; // Use named placeholder
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bindParam(':username', $username); // Bind parameter
    $stmt_check->execute();

    // Use fetchColumn() to efficiently check existence
    if ($stmt_check->fetchColumn()) {
        // Username found
        http_response_code(409); // Conflict
        echo json_encode(["success" => false, "message" => "Username already taken!"]);
        exit;
    }
    // If fetchColumn returns false, username is available

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Register Error (Username Check): " . $e->getMessage()); // Log error server-side
    echo json_encode(["success" => false, "message" => "Database error checking username. Please try again later."]);
    exit;
}

// --- Hash the password ---
$hashed_password = password_hash($password, PASSWORD_BCRYPT);

if ($hashed_password === false) {
    // Handle potential password_hash failure
    http_response_code(500);
    error_log("Register Error: password_hash failed.");
    echo json_encode(["success" => false, "message" => "Error processing registration. Please try again."]);
    exit;
}

// --- Insert into database ---
try {
    $sql_insert = "INSERT INTO users (username, email, password) VALUES (:username, :email, :password)";
    $stmt_insert = $conn->prepare($sql_insert);

    // Bind parameters
    $stmt_insert->bindParam(':username', $username);
    $stmt_insert->bindParam(':email', $email);
    $stmt_insert->bindParam(':password', $hashed_password);

    // Execute the insert statement
    if ($stmt_insert->execute()) {
        // Successfully inserted
        // Send success response WITH the redirect path
        echo json_encode(["success" => true, "redirect" => "/auth_system/MovieDBWebsite/home.html"]);
    } else {
        // execute() returned false, but no PDOException (less common)
        http_response_code(500);
        error_log("Register Error: Insert execute() returned false.");
        echo json_encode(["success" => false, "message" => "Failed to save registration details."]);
    }
} catch (PDOException $e) {
    // --- Catch potential DB error during insert ---
    http_response_code(500);
    error_log("Register Error (Insert): " . $e->getMessage()); // Log actual error server-side
    // Provide a generic error message to the user
    echo json_encode(["success" => false, "message" => "Database error during registration. Please try again later."]);
    exit; // Explicit exit after error
}
?>