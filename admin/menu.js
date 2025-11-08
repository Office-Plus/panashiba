// Load Font Awesome
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
document.head.appendChild(link);

// Load version configuration (only if not already loaded)
if (!window.APP_VERSION) {
    const versionScript = document.createElement('script');
    versionScript.src = 'version-config.js?v=1.0.3&t=' + Date.now();
    versionScript.onload = function() {
        // Set app version after version config is loaded
        setAppVersion();
    };
    document.head.appendChild(versionScript);
} else {
    // Version already loaded, set it immediately
    setAppVersion();
}

// Set user email
const userEmail = localStorage.getItem('userEmail');
if (userEmail) {
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        userEmailElement.textContent = userEmail;
    }
}

// Function to set app version
function setAppVersion() {
    const appVersionElement = document.getElementById('appVersion');
    if (appVersionElement) {
        if (window.APP_VERSION) {
            appVersionElement.textContent = 'v' + window.APP_VERSION;
        } else {
            // Fallback if version is not available
            appVersionElement.textContent = 'v1.0.3';
        }
    }
}

// Function to filter menu items based on userRights and userlevel
function filterMenuItems() {
    const userLevel = localStorage.getItem('userlevel');
    const userRightsStr = localStorage.getItem('userRights');
    const menuItems = document.querySelectorAll('.menu-items li');
    
    console.log('User Level:', userLevel);
    console.log('User Rights:', userRightsStr);
    
    // If userlevel is Admin, show all menu items
    if (userLevel === 'Admin') {
        menuItems.forEach(item => {
            if (!item.querySelector('a[onclick="logout()"]')) {
                item.style.display = 'block';
            }
        });
        return;
    }

    // If no userRights found, only show logout
    if (!userRightsStr) {
        menuItems.forEach(item => {
            if (item.querySelector('a[onclick="logout()"]')) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        return;
    }

    // For non-admin users, filter based on userRights
    const userRights = userRightsStr.split(',');
    console.log('Split User Rights:', userRights);
    
    menuItems.forEach(item => {
        const menuLink = item.querySelector('.menu-item');
        if (menuLink) {
            const formName = menuLink.getAttribute('data-form');
            console.log('Menu Item Form Name:', formName);
            if (formName && userRights.includes(formName)) {
                console.log('Showing menu item:', formName);
                item.style.display = 'block';
            } else if (item.querySelector('a[onclick="logout()"]')) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        }
    });
}

// Call filterMenuItems when the menu is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for menu to be loaded
    const checkMenu = setInterval(() => {
        const menu = document.querySelector('.side-menu');
        if (menu) {
            filterMenuItems();
            
            // Ensure app version is set
            setAppVersion();
            
            // Check for updates after menu is loaded
            if (window.VersionManager) {
                VersionManager.checkForUpdates();
            }
            
            clearInterval(checkMenu);
        }
    }, 100);
    
    // Also try to set version after a short delay to ensure version-config.js is loaded
    setTimeout(() => {
        setAppVersion();
    }, 500);
});

// Toggle menu function
window.toggleMenu = function() {
    const menu = document.querySelector('.side-menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Toggle masters submenu
window.toggleMasters = function() {
    const submenuItems = document.querySelectorAll('.masters-submenu');
    submenuItems.forEach(item => {
        item.style.display = item.style.display === 'none' ? 'block' : 'none';
    });
}

// Logout function
window.logout = function() {
    // First clear all localStorage items
    localStorage.clear();  // This will remove all items including userRights and userlevel
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRights');
    localStorage.removeItem('userlevel');
    localStorage.removeItem('companyCode');
    localStorage.removeItem(' faceId');
    
    // Then handle Firebase signOut
    const auth = firebase.auth();
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
} 