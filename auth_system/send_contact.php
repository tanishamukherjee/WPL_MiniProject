<?php
// File: AUTH_SYSTEM/send_contact.php

header("Content-Type: application/json"); // Set FIRST
require_once 'db.php'; // Include DB connection (uses require_once)

// Check if $conn exists from db.php
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available."]);
    exit;
}

// Only allow POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["success" => false, "message" => "Invalid request method! Expected POST."]);
    exit;
}

// --- Get and sanitize input ---
// Using filter_input for better security/validation where applicable
$name = isset($_POST['name']) ? trim(htmlspecialchars($_POST['name'])) : '';
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL); // Validate email format
$subject = isset($_POST['subject']) ? trim(htmlspecialchars($_POST['subject'])) : ''; // Subject is optional
$message = isset($_POST['message']) ? trim(htmlspecialchars($_POST['message'])) : '';

// --- Basic Validation ---
if (empty($name) || empty($message)) {
    http_response_code(400); // Bad Request
    echo json_encode(["success" => false, "message" => "Name and Message fields are required!"]);
    exit;
}

if ($email === false) { // filter_input returns false if validation fails
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid email format provided!"]);
    exit;
}

// --- Insert into database ---
try {
    $sql = "INSERT INTO contact_messages (name, email, subject, message) VALUES (:name, :email, :subject, :message)";
    $stmt = $conn->prepare($sql);

    // Bind parameters
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':subject', $subject); // Bind even if empty, DB allows NULL
    $stmt->bindParam(':message', $message);

    // Execute the insert statement
    if ($stmt->execute()) {
        // Successfully inserted
        echo json_encode(["success" => true, "message" => "Message sent successfully! Thank you."]);
        // Optionally: Send an email notification here if needed
    } else {
        // execute() returned false without Exception
        http_response_code(500);
        error_log("Contact Form Error: Insert execute() returned false.");
        echo json_encode(["success" => false, "message" => "Could not send message due to a server error."]);
    }
} catch (PDOException $e) {
    // --- Catch potential DB errors during insert ---
    http_response_code(500);
    error_log("Contact Form DB Error: " . $e->getMessage()); // Log actual error server-side
    echo json_encode(["success" => false, "message" => "A database error occurred. Please try again later."]);
    exit;
}
?>