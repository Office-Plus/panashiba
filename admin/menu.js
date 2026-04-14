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

function normalizeRights(value) {
    if (Array.isArray(value)) {
        return value.map(item => (item || '').toString().trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => (item || '').toString().trim()).filter(Boolean);
                }
            } catch (err) {
                console.log('[admin/menu.js] Could not parse JSON userRights:', err);
            }
        }
        return trimmed.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function saveRightsToLocalStorage(rightsArray) {
    const normalized = normalizeRights(rightsArray);
    localStorage.setItem('userRights', normalized.join(','));
    return normalized;
}

function ensureRightsPopup() {
    if (document.getElementById('rightsRecoveryOverlay')) return;
    const popupHtml = `
        <div id="rightsRecoveryOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:none;z-index:5000;align-items:center;justify-content:center;">
            <div style="background:#fff;padding:20px;border-radius:8px;max-width:420px;width:90%;box-shadow:0 6px 20px rgba(0,0,0,0.2);">
                <h3 style="margin:0 0 10px;color:#333;">User Rights Missing</h3>
                <p id="rightsRecoveryMessage" style="margin:0 0 15px;color:#555;line-height:1.4;">No user rights found in local storage. Click below to fetch latest rights from database.</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="rightsRecoveryCloseBtn" style="padding:9px 14px;border:1px solid #ccc;background:#fff;border-radius:5px;cursor:pointer;">Close</button>
                    <button id="rightsRecoveryFetchBtn" style="padding:9px 14px;border:none;background:#2196F3;color:#fff;border-radius:5px;cursor:pointer;">Fetch Rights</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    document.getElementById('rightsRecoveryCloseBtn').addEventListener('click', () => {
        const overlay = document.getElementById('rightsRecoveryOverlay');
        if (overlay) overlay.style.display = 'none';
    });

    document.getElementById('rightsRecoveryFetchBtn').addEventListener('click', async () => {
        await fetchRightsFromDbAndUpdate();
    });
}

function showRightsPopup(message) {
    ensureRightsPopup();
    const overlay = document.getElementById('rightsRecoveryOverlay');
    const msg = document.getElementById('rightsRecoveryMessage');
    if (msg && message) msg.textContent = message;
    if (overlay) overlay.style.display = 'flex';
}

function hideRightsPopup() {
    const overlay = document.getElementById('rightsRecoveryOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function fetchRightsFromDbAndUpdate() {
    try {
        if (!window.firebase || !firebase.firestore) {
            showRightsPopup('Firebase is not available on this page. Please refresh and try again.');
            return;
        }

        const db = firebase.firestore();
        const userId = localStorage.getItem('userId');
        const userEmail = (localStorage.getItem('userEmail') || '').trim();
        const companyCode = localStorage.getItem('companyCode');

        if (!userId && !userEmail) {
            showRightsPopup('Missing user identity. Please login again.');
            return;
        }

        let matchedData = null;
        let matchedPath = '';

        const tryFindInCompany = async (company) => {
            const usersPath = `complaints/cmplts/${company}/masters/users`;
            const usersCollection = db.collection('complaints')
                .doc('cmplts')
                .collection(company)
                .doc('masters')
                .collection('users');

            console.log('[admin/menu.js] Trying to fetch rights from path:', usersPath);

            if (userId) {
                const docById = await usersCollection.doc(userId).get();
                if (docById.exists) {
                    return { data: docById.data(), path: `${usersPath}/${docById.id}`, company };
                }
            }

            if (userId) {
                const byUid = await usersCollection.where('uid', '==', userId).limit(1).get();
                if (!byUid.empty) {
                    const doc = byUid.docs[0];
                    return { data: doc.data(), path: `${usersPath}/${doc.id}`, company };
                }
            }

            if (userEmail) {
                const byEmail = await usersCollection.where('email', '==', userEmail).limit(1).get();
                if (!byEmail.empty) {
                    const doc = byEmail.docs[0];
                    return { data: doc.data(), path: `${usersPath}/${doc.id}`, company };
                }
            }

            if (userEmail) {
                const allUsers = await usersCollection.get();
                const targetEmail = userEmail.toLowerCase();
                const ciDoc = allUsers.docs.find(d => ((d.data().email || '').toString().trim().toLowerCase() === targetEmail));
                if (ciDoc) {
                    return { data: ciDoc.data(), path: `${usersPath}/${ciDoc.id}`, company };
                }
            }

            return null;
        };

        if (companyCode) {
            const fromCurrentCompany = await tryFindInCompany(companyCode);
            if (fromCurrentCompany) {
                matchedData = fromCurrentCompany.data;
                matchedPath = fromCurrentCompany.path;
            }
        }

        if (!matchedData) {
            const cmpltsDoc = db.collection('complaints').doc('cmplts');
            const allCompanies = await cmpltsDoc.listCollections();
            for (const companyCollection of allCompanies) {
                const found = await tryFindInCompany(companyCollection.id);
                if (found) {
                    matchedData = found.data;
                    matchedPath = found.path;
                    localStorage.setItem('companyCode', found.company);
                    localStorage.setItem('normalizedCompanyCode', found.company.toUpperCase().replace(/\s+/g, ''));
                    break;
                }
            }
        }

        if (!matchedData) {
            showRightsPopup('No matching user record found in database for this account.');
            return;
        }

        const rights = saveRightsToLocalStorage(matchedData.userRights || []);
        const userlevel = matchedData.userlevel || 'user';
        localStorage.setItem('userlevel', userlevel);
        if (matchedData.companyCode) {
            localStorage.setItem('companyCode', matchedData.companyCode);
            localStorage.setItem('normalizedCompanyCode', matchedData.companyCode.toUpperCase().replace(/\s+/g, ''));
        }

        console.log('[admin/menu.js] Fetched user data from path:', matchedPath);
        console.log('[admin/menu.js] Fetched userRights value:', matchedData.userRights);
        console.log('[admin/menu.js] Saved userRights to localStorage:', rights.join(','));

        if (rights.length === 0) {
            showRightsPopup(`User record found at ${matchedPath}, but userRights is empty in DB.`);
            filterMenuItems();
            return;
        }

        hideRightsPopup();
        filterMenuItems();
    } catch (error) {
        console.error('[admin/menu.js] Error fetching rights from DB:', error);
        showRightsPopup('Error fetching rights from database. Check console for details.');
    }
}

// Function to filter menu items based on userRights and userlevel
function filterMenuItems() {
    const userLevel = localStorage.getItem('userlevel');
    const userRightsStr = localStorage.getItem('userRights') || '';
    const parsedRights = normalizeRights(userRightsStr);
    const menuItems = document.querySelectorAll('.menu-items li');
    const alwaysVisibleForms = ['settings'];
    
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
    if (parsedRights.length === 0) {
        menuItems.forEach(item => {
            const menuLink = item.querySelector('.menu-item');
            const formName = menuLink ? menuLink.getAttribute('data-form') : null;
            if (item.querySelector('a[onclick="logout()"]') || (formName && alwaysVisibleForms.includes(formName))) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        showRightsPopup('No user rights found in local storage. Click "Fetch Rights" to load latest rights from DB.');
        return;
    }

    // For non-admin users, filter based on userRights
    const userRights = parsedRights;
    console.log('Split User Rights:', userRights);
    
    menuItems.forEach(item => {
        const menuLink = item.querySelector('.menu-item');
        if (menuLink) {
            const formName = menuLink.getAttribute('data-form');
            console.log('Menu Item Form Name:', formName);
            if (formName && (alwaysVisibleForms.includes(formName) || userRights.includes(formName))) {
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
    // Clear all localStorage items
    localStorage.clear();
    
    // Explicitly remove specific keys to ensure they're gone
    localStorage.removeItem('companyCode');
    localStorage.removeItem('normalizedCompanyCode');
    localStorage.removeItem('userRights');
    localStorage.removeItem('userlevel');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('lastCheckedVersion');
    
    // Remove any complaint cache keys
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('complaintCache_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Then handle Firebase signOut
    const auth = firebase.auth();
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        // Even if signOut fails, redirect to login
        window.location.href = 'login.html';
    });
} 