<?php
// File: AUTH_SYSTEM/remove_from_list.php
require_once 'db.php';
require_once 'get_user_id.php';

// Check if $conn is set
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available in remove_from_list."]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Invalid request method. Expected POST.']);
    exit;
}

// Get data from AJAX request
$username = $_POST['username'] ?? null;
$itemId = filter_input(INPUT_POST, 'item_id', FILTER_VALIDATE_INT);
$itemType = $_POST['item_type'] ?? null;

// Basic validation
if (!$username || !$itemId || !$itemType) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Missing required data (username, item_id, item_type).']);
    exit;
}

if ($itemType !== 'movie' && $itemType !== 'tv') {
     http_response_code(400);
     echo json_encode(['success' => false, 'message' => 'Invalid item type. Must be movie or tv.']);
     exit;
}

// Get User ID
$userId = getUserIdByUsername($conn, $username);

if ($userId === null) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'User not found or invalid session.']);
    exit;
}

// Attempt to delete the item
try {
    // *** CORRECTED TABLE NAME: user_lists ***
    $sql = "DELETE FROM user_lists WHERE user_id = ? AND item_id = ? AND item_type = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$userId, $itemId, $itemType]);

    // Check if a row was actually deleted
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Item removed from list.']);
    } else {
        // Item might not have been in the list to begin with
        // Still send success=true because the desired state (item not in list) is achieved
        echo json_encode(['success' => true, 'message' => 'Item not found in list or already removed.']);
    }

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Database error removing item for user $userId (ID: $itemId, Type: $itemType): " . $e->getMessage()); // Log the actual error
    echo json_encode(['success' => false, 'message' => 'Database error removing item. Please try again.']); // Generic message to user
}
?>