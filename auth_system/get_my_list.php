<?php
// File: AUTH_SYSTEM/get_my_list.php
require_once 'db.php';
require_once 'get_user_id.php';

// Check if $conn is set
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection object not available in get_my_list."]);
    exit;
}

// Can be GET or POST depending on how you call it from JS
$username = $_REQUEST['username'] ?? null; // Use $_REQUEST to handle both GET/POST

if (!$username) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Username required.']);
    exit;
}

// Get User ID
$userId = getUserIdByUsername($conn, $username);

if ($userId === null) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'User not found or invalid session.']);
    exit;
}

// Fetch list items
try {
    // *** CORRECTED TABLE NAME: user_lists ***
    // *** CORRECTED COLUMN NAME: date_added ***
    // Added list_status in SELECT in case you want to use it later
    $sql = "SELECT item_id, item_type, title, poster_path, list_status, date_added
            FROM user_lists
            WHERE user_id = ?
            ORDER BY date_added DESC"; // Order by the actual column name

    $stmt = $conn->prepare($sql);
    $stmt->execute([$userId]);
    $listItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format list for JavaScript compatibility
    $formattedList = [];
    foreach ($listItems as $item) {
        $formattedList[] = [
            'id' => $item['item_id'],         // Matches JS expectation
            'type' => $item['item_type'],       // Matches JS expectation
            'title' => $item['title'],         // Matches JS expectation
            'poster_path' => $item['poster_path'], // Matches JS expectation
            'date' => $item['date_added'],      // Renamed 'date_added' to 'date' for JS
            'status' => $item['list_status']    // Included status if needed later in JS
        ];
    }

    // Send the formatted list
    echo json_encode(['success' => true, 'list' => $formattedList]);

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    error_log("Database error fetching list for user $userId: " . $e->getMessage()); // Log the actual error
    echo json_encode(['success' => false, 'message' => 'Database error occurred while fetching list.']); // Generic message to user
}
?>