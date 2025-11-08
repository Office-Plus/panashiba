<?php
// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "paezr";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Check if menu_items table exists
$tableCheck = $conn->query("SHOW TABLES LIKE 'menu_items'");
if ($tableCheck->num_rows == 0) {
    echo "Table 'menu_items' does not exist. Creating it...<br>";
    
    // Create the table
    $createTable = "CREATE TABLE menu_items (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        page_name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    if ($conn->query($createTable) === TRUE) {
        echo "Table 'menu_items' created successfully.<br>";
    } else {
        echo "Error creating table: " . $conn->error . "<br>";
    }
} else {
    echo "Table 'menu_items' exists.<br>";
}

// Check if there are any records in the table
$result = $conn->query("SELECT COUNT(*) as count FROM menu_items");
$row = $result->fetch_assoc();
$count = $row['count'];

if ($count == 0) {
    echo "No menu items found. Adding sample menu items...<br>";
    
    // Sample menu items
    $menuItems = [
        'attendance',
        'leave',
        'holiday',
        'employee',
        'department',
        'designation',
        'shift',
        'company',
        'settings',
        'reports'
    ];
    
    // Insert sample menu items
    $insertCount = 0;
    foreach ($menuItems as $item) {
        $sql = "INSERT INTO menu_items (page_name) VALUES ('$item')";
        if ($conn->query($sql) === TRUE) {
            $insertCount++;
        }
    }
    
    echo "$insertCount menu items added successfully.<br>";
} else {
    echo "Found $count menu items in the table.<br>";
    
    // Display all menu items
    $result = $conn->query("SELECT * FROM menu_items ORDER BY page_name");
    echo "<h3>Current Menu Items:</h3>";
    echo "<ul>";
    while ($row = $result->fetch_assoc()) {
        echo "<li>" . $row['page_name'] . "</li>";
    }
    echo "</ul>";
}

// Close connection
$conn->close();
?> 