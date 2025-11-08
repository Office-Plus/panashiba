<?php
// Disable error display in output
ini_set('display_errors', 0);
error_reporting(0);

// Set headers for JSON response
header('Content-Type: application/json');

// Path to menu.html file
$menuFilePath = '../admin/menu.html';

// Default menu items if file not found
$menuItems = ['dashboard'];

// Check if file exists
if (file_exists($menuFilePath)) {
    // Read the menu.html file
    $menuContent = file_get_contents($menuFilePath);
    
    // Extract menu items using regex
    // This pattern looks for menu items with data-form attribute
    preg_match_all('/<a[^>]*data-form=["\']([^"\']+)["\'][^>]*>/', $menuContent, $matches);
    
    if (!empty($matches[1])) {
        // Process the matches to extract page names
        foreach ($matches[1] as $pageName) {
            // Skip empty pages
            if (!empty($pageName) && $pageName !== 'masters') {
                $menuItems[] = $pageName;
            }
        }
    }
    
    // If no menu items found, try an alternative approach
    if (count($menuItems) <= 1) {
        // Try to find menu items by href
        preg_match_all('/<a[^>]*href=["\']([^"\']+)["\'][^>]*>/', $menuContent, $matches);
        
        if (!empty($matches[1])) {
            foreach ($matches[1] as $href) {
                // Skip empty, index, or special links
                if (!empty($href) && $href !== '#' && $href !== 'index.html' && strpos($href, 'logout') === false) {
                    // Extract the page name from the href
                    $pageName = basename($href, '.html');
                    
                    if (!empty($pageName) && !in_array($pageName, $menuItems)) {
                        $menuItems[] = $pageName;
                    }
                }
            }
        }
    }
}

// Remove duplicates and sort
$menuItems = array_unique($menuItems);
sort($menuItems);

// Return the menu items as JSON
echo json_encode($menuItems);
?> 