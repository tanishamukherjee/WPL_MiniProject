<?php
header("Content-Type: application/json");
require 'db.php'; 

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method!"]);
    exit;
}

// Get user input and sanitize
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? trim($_POST['password']) : '';

if (empty($username) || empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "All fields are required!"]);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Invalid email format!"]);
    exit;
}

// Check if username already exists
$sql = "SELECT * FROM users WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->execute([$username]);

if ($stmt->rowCount() > 0) {
    echo json_encode(["success" => false, "message" => "Username already taken!"]);
    exit;
}

// Hash the password
$hashed_password = password_hash($password, PASSWORD_BCRYPT);

// Insert into database
$sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);

if ($stmt->execute([$username, $email, $hashed_password])) {
    echo json_encode(["success" => true, "redirect" => "/auth_system/MovieDBWebsite/home.html"]);
} else {
    echo json_encode(["success" => false, "message" => "Database error!"]);
}
?>