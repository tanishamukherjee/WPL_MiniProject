<?php
// File: AUTH_SYSTEM/get_user_id.php
// Note: This file should NOT be directly accessible via URL.
// It's meant to be included by other PHP scripts.

if (!isset($conn)) {
    // If db.php wasn't included before calling this, include it.
    // This check prevents errors if included multiple times.
    require_once 'db.php';
}

function getUserIdByUsername(PDO $conn, ?string $username): ?int {
    if (empty($username)) {
        return null;
    }

    try {
        $sql = "SELECT id FROM users WHERE username = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ? (int)$user['id'] : null;
    } catch (PDOException $e) {
        // Log error or handle appropriately
        // For simplicity here, we return null
        error_log("Error fetching user ID for username $username: " . $e->getMessage());
        return null;
    }
}
?>