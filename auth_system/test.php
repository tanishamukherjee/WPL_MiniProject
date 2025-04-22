<?php
echo "PHP is working!";
?>

<?php
header("Content-Type: application/json");
require 'db.php'; 

// Allow CORS for local testing (remove in production)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

// Check for POST request
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method!"]);
    exit;
}

// Get user input
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? trim($_POST['password']) : '';

// Validate inputs
if (empty($username) || empty($password)) {
    echo json_encode(["success" => false, "message" => "All fields are required!"]);
    exit;
}

// Check if user exists
try {
    $sql = "SELECT * FROM users WHERE username = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verify password
    if ($user && password_verify($password, $user['password'])) {
        echo json_encode(["success" => true, "redirect" => "/auth_system/MovieDBWebsite/home.html"]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid credentials!"]);
    }
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Database query failed: " . $e->getMessage()]);
}
?>