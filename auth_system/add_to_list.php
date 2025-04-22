<?php
// File: AUTH_SYSTEM/add_to_list.php
require_once 'db.php'; // Ensures $conn is available and sets header
require_once 'get_user_id.php'; // Include the helper function

// Check if $conn is set
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available in add_to_list."]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Invalid request method. Expected POST.']);
    exit;
}

// Get data from the AJAX request
$username = $_POST['username'] ?? null;
$itemId = filter_input(INPUT_POST, 'item_id', FILTER_VALIDATE_INT);
$itemType = $_POST['item_type'] ?? null;
$title = $_POST['title'] ?? null;
$posterPath = $_POST['poster_path'] ?? null; // Can be null

// Basic Validation
if (!$username || !$itemId || !$itemType || $itemType === '' || !$title) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Missing required data (username, item_id, item_type, title).']);
    exit;
}

if ($itemType !== 'movie' && $itemType !== 'tv') {
     http_response_code(400);
     echo json_encode(['success' => false, 'message' => 'Invalid item type. Must be movie or tv.']);
     exit;
}

// Get user ID
$userId = getUserIdByUsername($conn, $username);

if ($userId === null) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'User not found or invalid session.']);
    exit;
}

// Attempt to insert the item
try {
    // *** CORRECTED TABLE NAME: user_lists ***
    // Using INSERT IGNORE to handle the unique constraint (user_id, item_id, item_type) gracefully
    // Added list_status and date_added columns based on schema image
    $sql = "INSERT IGNORE INTO user_lists (user_id, item_id, item_type, title, poster_path, list_status, date_added)
            VALUES (?, ?, ?, ?, ?, ?, NOW())";
            // Assuming default list_status is 'added' or similar - adjust if needed
            // Using NOW() to automatically set the current timestamp for date_added

    $stmt = $conn->prepare($sql);
    // Execute with parameters - Added 'added' for list_status
    // Make sure the order matches the placeholders in the SQL
    $stmt->execute([
        $userId,
        $itemId,
        $itemType,
        $title,
        $posterPath,
        'added' // Provide a default value for list_status, adjust if necessary
    ]);

    // Check if a row was actually inserted (rowCount > 0) or if it was ignored
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Item added to list.']);
    } else {
        // If rowCount is 0, it likely means the item already existed due to INSERT IGNORE
        echo json_encode(['success' => true, 'message' => 'Item already in list.']);
    }

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Database error adding item for user $userId (ID: $itemId, Type: $itemType): " . $e->getMessage()); // Log the actual error
    echo json_encode(['success' => false, 'message' => 'Database error adding item. Please try again.']); // Generic message to user
}
?>