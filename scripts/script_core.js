// ==UserScript==
// @name         CAR Batch Extractor
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Loop through all CARs in the report listing and extract data to display in a left ribbon
// @author       You
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const ACCESS_CONTROL_URL = 'https://raw.githubusercontent.com/JwoToLee/pScript/main/config/access_control.json';
    const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
    
    // Global variables for access control
    let accessControlData = null;
    let userCredentials = null;
    let isAuthorized = false;
    let lastAccessCheck = 0;
    let loginAttempts = 0;
    let isLockedOut = false;
    let lockoutEndTime = null;

    // Login and session management functions
    function getStoredCredentials() {
        try {
            const stored = GM_getValue('userCredentials', null);
            if (stored) {
                const credentials = JSON.parse(stored);
                // Check if session is still valid
                const sessionAge = Date.now() - (credentials.loginTime || 0);
                const maxAge = (accessControlData?.accessControl?.sessionTimeout || 24) * 60 * 60 * 1000;
                
                if (sessionAge < maxAge) {
                    console.log('Valid session found for user:', credentials.username);
                    return credentials;
                } else {
                    console.log('Session expired, clearing stored credentials');
                    GM_setValue('userCredentials', null);
                    return null;
                }
            }
        } catch (error) {
            console.warn('Error retrieving stored credentials:', error);
            GM_setValue('userCredentials', null);
        }
        return null;
    }

    function storeCredentials(username, password) {
        const credentials = {
            username: username,
            password: password,
            loginTime: Date.now()
        };
        GM_setValue('userCredentials', JSON.stringify(credentials));
        console.log('Credentials stored for user:', username);
        return credentials;
    }

    function clearStoredCredentials() {
        GM_setValue('userCredentials', null);
        userCredentials = null;
        isAuthorized = false;
        console.log('Stored credentials cleared');
    }

    function checkLockout() {
        if (isLockedOut && lockoutEndTime && Date.now() > lockoutEndTime) {
            isLockedOut = false;
            lockoutEndTime = null;
            loginAttempts = 0;
            console.log('Lockout period expired, resetting attempts');
        }
        return isLockedOut;
    }

    function showLoginDialog() {
        return new Promise((resolve) => {
            // Check if already locked out
            if (checkLockout()) {
                const remainingTime = Math.ceil((lockoutEndTime - Date.now()) / 1000 / 60);
                showLoginErrorMessage(`Account locked. Please wait ${remainingTime} minutes before trying again.`);
                resolve(null);
                return;
            }

            const loginDiv = document.createElement('div');
            loginDiv.id = 'car-extractor-login';
            loginDiv.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.8); z-index: 10005; display: flex; 
                            align-items: center; justify-content: center; font-family: 'Consolas', 'Monaco', 'Courier New', monospace;">
                    <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); 
                               color: white; padding: 30px; border-radius: 10px; 
                               box-shadow: 0 10px 30px rgba(0,0,0,0.5); min-width: 400px;">
                        <h2 style="margin: 0 0 20px 0; text-align: center; color: #3498db;">[LOGIN] CAR Extractor Login</h2>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Username:</label>
                            <input type="text" id="login-username" 
                                   style="width: 100%; padding: 10px; border: 1px solid #34495e; 
                                          border-radius: 5px; background: #ecf0f1; color: #2c3e50; 
                                          font-family: 'Consolas', monospace; font-size: 14px;" 
                                   placeholder="Enter your username">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Password:</label>
                            <input type="password" id="login-password" 
                                   style="width: 100%; padding: 10px; border: 1px solid #34495e; 
                                          border-radius: 5px; background: #ecf0f1; color: #2c3e50; 
                                          font-family: 'Consolas', monospace; font-size: 14px;" 
                                   placeholder="Enter your password">
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="login-submit-btn" 
                                    style="background: #3498db; color: white; border: none; 
                                           padding: 12px 24px; border-radius: 5px; cursor: pointer; 
                                           font-family: 'Consolas', monospace; font-size: 14px; font-weight: bold;">
                                Login
                            </button>
                            <button id="login-cancel-btn" 
                                    style="background: #95a5a6; color: white; border: none; 
                                           padding: 12px 24px; border-radius: 5px; cursor: pointer; 
                                           font-family: 'Consolas', monospace; font-size: 14px;">
                                Cancel
                            </button>
                        </div>
                        <div id="login-error-message" style="color: #e74c3c; margin-top: 15px; 
                             text-align: center; font-size: 12px; display: none;"></div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #34495e; 
                             font-size: 11px; color: #bdc3c7; text-align: center;">
                            Contact jt-bryce.lee@haesl.com for access credentials
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(loginDiv);

            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const submitBtn = document.getElementById('login-submit-btn');
            const cancelBtn = document.getElementById('login-cancel-btn');
            const errorDiv = document.getElementById('login-error-message');

            function showError(message) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }

            function hideError() {
                errorDiv.style.display = 'none';
            }

            function cleanup() {
                if (loginDiv.parentElement) {
                    loginDiv.remove();
                }
            }

            function attemptLogin() {
                const username = usernameInput.value.trim();
                const password = passwordInput.value;

                hideError();

                if (!username || !password) {
                    showError('Please enter both username and password');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';

                setTimeout(() => {
                    cleanup();
                    resolve({ username, password });
                }, 500);
            }

            submitBtn.addEventListener('click', attemptLogin);
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            // Handle Enter key
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    attemptLogin();
                }
            });

            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    passwordInput.focus();
                }
            });

            // Focus on username input
            setTimeout(() => usernameInput.focus(), 100);
        });
    }

    function showLoginErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'car-extractor-login-error';
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(180deg, #dc3545 0%, #c82333 100%); 
                        color: white; padding: 20px; border-radius: 8px; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 10006; 
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        max-width: 400px; text-align: center;">
                <h3 style="margin: 0 0 15px 0;">[ERROR] Login Failed</h3>
                <p style="margin: 0 0 15px 0;">${message}</p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                               color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Access control functions
    async function fetchAccessControl() {
        return new Promise((resolve) => {
            try {
                console.log('Fetching access control configuration...');
                
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: ACCESS_CONTROL_URL + '?t=' + Date.now(),
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    onload: function(response) {
                        try {
                            if (response.status === 200) {
                                const data = JSON.parse(response.responseText);
                                console.log('Access control data loaded:', data);
                                resolve(data);
                            } else {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                            }
                        } catch (parseError) {
                            console.error('Failed to parse access control JSON:', parseError);
                            console.log('Using fallback access control configuration due to parse error...');
                            resolve({
                                globalEnabled: true,
                                accessControl: { 
                                    enabled: true, 
                                    mode: 'login',
                                    allowedUsers: [
                                        { username: 'jwo', password: '0927', name: 'Admin', active: true },
                                        { username: 'user', password: 'user123', name: 'User', active: true }
                                    ],
                                    sessionTimeout: 50,
                                    maxLoginAttempts: 5,
                                    lockoutDuration: 30
                                },
                                features: { extraction: true, export: true, debug: true },
                                message: { 
                                    unauthorized: 'Access control configuration error. Using offline mode.',
                                    disabled: 'Access control service error. Using fallback configuration.',
                                    invalid_credentials: 'Invalid username or password. Please try again.',
                                    account_locked: 'Account temporarily locked due to too many failed attempts.'
                                }
                            });
                        }
                    },
                    onerror: function(error) {
                        console.error('Failed to fetch access control:', error);
                        console.log('Using fallback access control configuration...');
                        resolve({
                            globalEnabled: true,
                            accessControl: { 
                                enabled: true, 
                                mode: 'login',
                                allowedUsers: [
                                    { username: 'jwo', password: '0927', name: 'Admin', active: true },
                                    { username: 'user', password: 'user123', name: 'User', active: true }
                                ],
                                sessionTimeout: 50,
                                maxLoginAttempts: 5,
                                lockoutDuration: 30
                            },
                            features: { extraction: true, export: true, debug: true },
                            message: { 
                                unauthorized: 'Cannot verify access permissions online. Using offline mode.',
                                disabled: 'Access control service unavailable. Using fallback configuration.',
                                invalid_credentials: 'Invalid username or password. Please try again.',
                                account_locked: 'Account temporarily locked due to too many failed attempts.'
                            }
                        });
                    },
                    ontimeout: function() {
                        console.error('Access control fetch timeout');
                        console.log('Using fallback access control configuration due to timeout...');
                        resolve({
                            globalEnabled: true,
                            accessControl: { 
                                enabled: true, 
                                mode: 'login',
                                allowedUsers: [
                                    { username: 'jwo', password: '0927', name: 'Admin', active: true },
                                    { username: 'user', password: 'user123', name: 'User', active: true }
                                ],
                                sessionTimeout: 50,
                                maxLoginAttempts: 5,
                                lockoutDuration: 30
                            },
                            features: { extraction: true, export: true, debug: true },
                            message: { 
                                unauthorized: 'Access verification timeout. Using offline mode.',
                                disabled: 'Access control service timeout. Using fallback configuration.',
                                invalid_credentials: 'Invalid username or password. Please try again.',
                                account_locked: 'Account temporarily locked due to too many failed attempts.'
                            }
                        });
                    },
                    timeout: 10000
                });
                
            } catch (error) {
                console.error('Failed to initiate access control fetch:', error);
                console.log('Using fallback access control configuration due to initialization error...');
                resolve({
                    globalEnabled: true,
                    accessControl: { 
                        enabled: true, 
                        mode: 'login',
                        allowedUsers: [
                            { username: 'jwo', password: '0927', name: 'Admin', active: true },
                            { username: 'user', password: 'user123', name: 'User', active: true }
                        ],
                        sessionTimeout: 50,
                        maxLoginAttempts: 5,
                        lockoutDuration: 30
                    },
                    features: { extraction: true, export: true, debug: true },
                    message: { 
                        unauthorized: 'Access control initialization error. Using offline mode.',
                        disabled: 'Access control service error. Using fallback configuration.',
                        invalid_credentials: 'Invalid username or password. Please try again.',
                        account_locked: 'Account temporarily locked due to too many failed attempts.'
                    }
                });
            }
        });
    }

    function checkUserAccess(accessData, credentials) {
        if (!accessData) return { authorized: false, reason: 'no_data', message: 'Access control data unavailable' };
        
        // Check if globally disabled
        if (!accessData.globalEnabled) {
            return { authorized: false, reason: 'disabled', message: accessData.message?.disabled };
        }
        
        // Check if access control is disabled (allow all)
        if (!accessData.accessControl?.enabled) {
            return { authorized: true };
        }
        
        if (!credentials || !credentials.username || !credentials.password) {
            return { authorized: false, reason: 'no_credentials', message: 'Login credentials required' };
        }
        
        const { allowedUsers } = accessData.accessControl;
        
        if (!allowedUsers || !Array.isArray(allowedUsers)) {
            return { authorized: false, reason: 'config_error', message: 'Access control configuration error' };
        }
        
        // Find user in allowed users list
        const user = allowedUsers.find(u => 
            u.username === credentials.username && 
            u.password === credentials.password &&
            u.active === true
        );
        
        if (user) {
            console.log(`[LOGIN_OK] Login successful for user: ${user.name} (${user.username})`);
            return { 
                authorized: true, 
                user: {
                    username: user.username,
                    name: user.name
                }
            };
        }
        
        return { 
            authorized: false, 
            reason: 'invalid_credentials', 
            message: accessData.message?.invalid_credentials || 'Invalid username or password'
        };
    }

    async function verifyAccess() {
        const now = Date.now();
        
        console.log('Verifying user access...');
        
        // Fetch current access control data
        accessControlData = await fetchAccessControl();
        
        // Check for stored credentials first
        userCredentials = getStoredCredentials();
        
        if (userCredentials) {
            // Verify stored credentials
            const accessResult = checkUserAccess(accessControlData, userCredentials);
            
            if (accessResult.authorized) {
                isAuthorized = true;
                lastAccessCheck = now;
                console.log('Access granted using stored credentials for:', userCredentials.username);
                return { 
                    authorized: true, 
                    user: accessResult.user,
                    data: accessControlData 
                };
            } else {
                // Stored credentials are invalid, clear them
                console.log('Stored credentials invalid, clearing...');
                clearStoredCredentials();
            }
        }
        
        // No valid stored credentials, need to login
        console.log('No valid stored credentials, login required');
        const credentials = await showLoginDialog();
        
        if (!credentials) {
            return { 
                authorized: false, 
                reason: 'login_cancelled',
                message: 'Login cancelled by user',
                data: accessControlData 
            };
        }
        
        // Verify the entered credentials
        const accessResult = checkUserAccess(accessControlData, credentials);
        
        if (accessResult.authorized) {
            // Store credentials for future use
            userCredentials = storeCredentials(credentials.username, credentials.password);
            isAuthorized = true;
            lastAccessCheck = now;
            loginAttempts = 0; // Reset failed attempts on successful login
            
            console.log('Access granted after login for:', credentials.username);
            return { 
                authorized: true, 
                user: accessResult.user,
                data: accessControlData 
            };
        } else {
            // Login failed
            loginAttempts++;
            console.log(`Login failed. Attempt ${loginAttempts}/${accessControlData?.accessControl?.maxLoginAttempts || 3}`);
            
            const maxAttempts = accessControlData?.accessControl?.maxLoginAttempts || 3;
            const lockoutDuration = accessControlData?.accessControl?.lockoutDuration || 30;
            
            if (loginAttempts >= maxAttempts) {
                isLockedOut = true;
                lockoutEndTime = Date.now() + (lockoutDuration * 60 * 1000);
                console.log(`Account locked for ${lockoutDuration} minutes due to too many failed attempts`);
                
                return { 
                    authorized: false, 
                    reason: 'account_locked',
                    message: accessControlData?.message?.account_locked || 'Account temporarily locked',
                    data: accessControlData 
                };
            }
            
            // Show error and allow retry
            showLoginErrorMessage(accessResult.message);
            
            // Recursively call verifyAccess to show login dialog again
            return await verifyAccess();
        }
    }

    function showAccessDeniedMessage(reason, message) {
        const deniedDiv = document.createElement('div');
        deniedDiv.id = 'car-extractor-access-denied';
        deniedDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(180deg, #dc3545 0%, #c82333 100%); 
                        color: white; padding: 20px; border-radius: 8px; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 10003; 
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        max-width: 400px; text-align: center;">
                <h3 style="margin: 0 0 15px 0;">[DENIED] Access Denied</h3>
                <p style="margin: 0 0 15px 0;">${message || 'You are not authorized to use this tool.'}</p>
                <p style="margin: 0 0 15px 0; font-size: 12px; opacity: 0.8;">
                    Reason: ${reason || 'Unknown'}
                </p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                               color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(deniedDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (deniedDiv.parentElement) {
                deniedDiv.remove();
            }
        }, 10000);
    }

    function showAccessStatus(user) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'car-extractor-access-status';
        statusDiv.innerHTML = `
            <div style="position: fixed; bottom: 10px; right: 10px; 
                        background: rgba(40, 167, 69, 0.9); color: white; 
                        padding: 8px 12px; border-radius: 4px; 
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 11px; z-index: 10002;">
                [OK] Logged in as: ${user?.name || user?.username || 'User'}
            </div>
        `;
        document.body.appendChild(statusDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (statusDiv.parentElement) {
                statusDiv.remove();
            }
        }, 3000);
    }

        // Create left ribbon UI
    function createUI() {
        const ribbon = document.createElement('div');
        ribbon.id = 'car-extractor-ribbon';
        ribbon.innerHTML = `
            <div class="ribbon-header">
                <span>CAR BATCH EXTRACTOR v4.0</span>
                <div class="header-buttons">
                    <button id="debug-page-btn" title="Debug">debug</button>
                    <button id="logout-btn" title="Logout">logout</button>
                    <button id="minimize-ribbon-btn" title="Minimize">-</button>
                </div>
            </div>
            <div class="ribbon-navigation">
                <div class="nav-tab active" id="extractor-tab" data-tab="extractor">
                    <span>Extract</span>
                </div>
                <div class="nav-tab" id="console-tab" data-tab="console">
                    <span>Console</span>
                </div>
                <div class="nav-tab" id="settings-tab" data-tab="settings">
                    <span>Settings</span>
                </div>
                <div class="nav-tab" id="help-tab" data-tab="help">
                    <span>Help</span>
                </div>
            </div>
            <div id="ribbon-content">
                <div class="tab-content active" id="extractor-content">
                    <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                        <button id="start-extraction-btn">start</button>
                        <button id="pause-extraction-btn" disabled>pause</button>
                        <button id="stop-extraction-btn" disabled>stop</button>
                    </div>
                    <div id="progress-info">Ready to extract CAR data</div>
                    <div id="status-info">Waiting for input...</div>
                    <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                        <button id="export-results-btn" disabled>export</button>
                        <button id="clear-results-btn">clear</button>
                    </div>
                    <div id="car-results"></div>
                </div>
                <div class="tab-content" id="console-content">
                    <div class="tbd-content">
                        <h3>Console</h3>
                        <p>TBD - Console logs and debugging information will be displayed here.</p>
                    </div>
                </div>
                <div class="tab-content" id="settings-content">
                    <div class="tbd-content">
                        <h3>Settings</h3>
                        <p>TBD - Configuration options and preferences will be available here.</p>
                    </div>
                </div>
                <div class="tab-content" id="help-content">
                    <div class="help-content">
                        <h3>CAR Extractor Help</h3>
                        
                        <div class="help-section">
                            <h4>Getting Started</h4>
                            <p>- Navigate to reports page</p>
                            <p>- Click <strong>Start</strong> to begin extraction</p>
                            <p>- Process runs <strong>5 concurrent windows</strong> for faster extraction</p>
                            <p>- Use <strong>Pause/Resume</strong> to control the process</p>
                            <p>- Click <strong>Stop</strong> to halt extraction</p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Tab Navigation</h4>
                            <p><strong>Extract:</strong> Main extraction controls</p>
                            <p><strong>Console:</strong> Logs and debugging info</p>
                            <p><strong>Settings:</strong> Configuration options</p>
                            <p><strong>Help:</strong> Help guide</p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Controls</h4>
                            <p><strong>Header Buttons:</strong></p>
                            <p><code>debug</code> - Show debug information</p>
                            <p><code>logout</code> - Sign out of the tool</p>
                            <p><code>-</code> - Minimize the ribbon</p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Data Management</h4>
                            <p><strong>Export:</strong> Download extracted data as CSV</p>
                            <p><strong>Clear:</strong> Remove all extracted data</p>
                            <p><strong>Right-click CAR:</strong> Refresh individual entries</p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Status Types</h4>
                            <p><strong>Investigation:</strong> Initial investigation stage</p>
                            <p><strong>QA Follow-up:</strong> Quality assurance review stage</p>
                            <p><strong>HQA Closure:</strong> Final headquarters quality closure stage</p>
                            <p><em>Status automatically shows the most advanced stage found</em></p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Performance Features</h4>
                            <p><strong>Concurrent Processing:</strong> Runs 5 parallel extractions</p>
                            <p><strong>Background Mode:</strong> Hidden popup windows</p>
                            <p><strong>Batch Processing:</strong> Processes in groups of 5</p>
                            <p><strong>Smart Timeouts:</strong> 20-second timeout per CAR</p>
                        </div>
                        
                        <div class="help-section">
                            <h4>Troubleshooting</h4>
                            <p>- If extraction stops, check page loading</p>
                            <p>- Use debug button for technical details</p>
                            <p>- Clear data if results seem corrupted</p>
                            <p>- Refresh individual CARs if data is missing</p>
                            <p>- Concurrent mode may consume more browser resources</p>
                        </div>
                        <div class="help-section">
                            <h4>Performance Tips</h4>
                            <p>- The extractor now opens <strong>5 popups at a time</strong> for much faster data capture.</p>
                            <p>- If your browser or system is slow, reduce the number of open tabs or close other applications.</p>
                            <p>- Some browsers may block popups; allow popups for best results.</p>
                            <p>- For best performance, use a modern browser and keep the report page visible.</p>
                        </div>
                        
                        <div class="help-contact">
                            <h4>Support</h4>
                            <p>Contact: <strong>jt-bryce.lee@haesl.com</strong></p>
                            <p>Version: <strong>4.1</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(ribbon);
        
        // Create minimized state button
        const minimizedBtn = document.createElement('div');
        minimizedBtn.id = 'ribbon-minimized-btn';
        minimizedBtn.innerHTML = '>';
        minimizedBtn.title = 'Show CAR Extractor';
        minimizedBtn.style.display = 'flex'; // Show minimized button by default
        document.body.appendChild(minimizedBtn);
        
        // Start with ribbon minimized
        ribbon.style.display = 'none';
        document.body.classList.add('ribbon-minimized');
        
        // Add event listeners
        document.getElementById('debug-page-btn').addEventListener('click', debugPage);
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('start-extraction-btn').addEventListener('click', startExtraction);
        document.getElementById('pause-extraction-btn').addEventListener('click', pauseExtraction);
        document.getElementById('stop-extraction-btn').addEventListener('click', stopExtraction);
        document.getElementById('export-results-btn').addEventListener('click', exportResults);
        document.getElementById('clear-results-btn').addEventListener('click', clearResults);
        document.getElementById('minimize-ribbon-btn').addEventListener('click', minimizeRibbon);
        document.getElementById('ribbon-minimized-btn').addEventListener('click', maximizeRibbon);
        
        // Add tab navigation event listeners
        document.getElementById('extractor-tab').addEventListener('click', () => switchTab('extractor'));
        document.getElementById('console-tab').addEventListener('click', () => switchTab('console'));
        document.getElementById('settings-tab').addEventListener('click', () => switchTab('settings'));
        document.getElementById('help-tab').addEventListener('click', () => switchTab('help'));
        
        // Initialize the first tab as active
        switchTab('extractor');
        
        // Create context menu for individual CAR refresh
        createContextMenu();
    }

    // Add CSS for the ribbon
    GM_addStyle(`
        #car-extractor-ribbon {
            position: fixed;
            left: 0;
            top: 0;
            width: 340px;
            height: 100vh;
            background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e8eaed;
            z-index: 10000;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.1);
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            overflow-y: auto;
            padding: 20px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 0 15px 15px 0;
        }
        
        #car-extractor-ribbon button {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.3px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 8px 14px;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
        }
        
        #car-extractor-ribbon button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: #ffffff;
        }
        
        #car-extractor-ribbon button:active {
            background: rgba(255, 255, 255, 0.08);
        }
        
        #debug-page-btn, #logout-btn, #start-extraction-btn, 
        #pause-extraction-btn, #stop-extraction-btn, 
        #export-results-btn, #clear-results-btn {
            background: rgba(255, 255, 255, 0.1) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        #debug-page-btn:hover, #logout-btn:hover, #start-extraction-btn:hover,
        #pause-extraction-btn:hover, #stop-extraction-btn:hover,
        #export-results-btn:hover, #clear-results-btn:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
        }
        
        .car-entry {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
            margin-bottom: 8px;
            padding: 12px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
            font-size: 11px;
            line-height: 1.5;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .car-entry.loading {
            border-left-color: #f093fb;
            background: linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(240, 147, 251, 0.1) 100%);
            border-color: rgba(240, 147, 251, 0.3);
        }
        
        .car-entry.error {
            border-left-color: #ff6b6b;
            background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.1) 100%);
            border-color: rgba(255, 107, 107, 0.3);
        }
        
        .car-entry:hover {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .car-id {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 4px;
            color: #58a6ff;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        
        .car-details {
            color: #8b949e;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        
        .car-details div {
            margin-bottom: 1px;
        }
        
        .car-details strong {
            color: #c9d1d9;
            font-weight: 500;
        }
        
        #progress-info {
            font-size: 12px;
            color: #ffffff;
            min-height: 16px;
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            margin-bottom: 8px;
        }
        
        #status-info {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            min-height: 14px;
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            padding: 6px 10px;
            border-radius: 6px;
            font-style: italic;
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 12px;
        }
        
        #car-results {
            margin-top: 10px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        #car-results::-webkit-scrollbar {
            width: 6px;
        }
        
        #car-results::-webkit-scrollbar-track {
            background: rgba(13, 17, 23, 0.3);
            border-radius: 3px;
        }
        
        #car-results::-webkit-scrollbar-thumb {
            background: rgba(48, 54, 61, 0.6);
            border-radius: 3px;
        }
        
        #car-results::-webkit-scrollbar-thumb:hover {
            background: rgba(48, 54, 61, 0.8);
        }
        
        /* Adjust main content to make space for ribbon */
        body {
            margin-left: 340px !important;
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        body.ribbon-minimized {
            margin-left: 0px !important;
        }
        
        /* Add some modern styling */
        .ribbon-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #ffffff;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            margin-bottom: 20px;
            font-size: 15px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 15px;
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
            padding: 15px;
            margin: -20px -20px 20px -20px;
            backdrop-filter: blur(5px);
        }
        
        .header-buttons {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .header-buttons button {
            font-size: 10px !important;
            padding: 4px 8px !important;
            min-width: auto !important;
            height: auto !important;
            font-weight: 500 !important;
        }
        
        #debug-page-btn, #logout-btn {
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        
        #debug-page-btn:hover, #logout-btn:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
        }
        
        #minimize-ribbon-btn {
            background: transparent !important;
            color: rgba(255, 255, 255, 0.8) !important;
            border: none !important;
            border-radius: 4px !important;
            padding: 6px 8px !important;
            font-size: 16px !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            font-weight: normal !important;
            line-height: 1 !important;
            width: auto !important;
            height: auto !important;
        }
        
        #minimize-ribbon-btn:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            transform: none !important;
            box-shadow: none !important;
        }
        
        #ribbon-minimized-btn {
            position: fixed;
            left: 10px;
            top: 10px;
            width: 35px;
            height: 35px;
            background: #ffffff;
            border: 2px solid #58a6ff;
            border-radius: 50%;
            color: #58a6ff;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        
        #ribbon-minimized-btn:hover {
            background: #f8f9fa;
            border-color: #79c0ff;
            color: #79c0ff;
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(88, 166, 255, 0.3);
        }
        
        .car-context-menu {
            position: fixed;
            background: linear-gradient(180deg, #161b22 0%, #1c2128 100%);
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 4px 0;
            z-index: 10002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 11px;
            min-width: 120px;
            display: none;
        }
        
        .car-context-menu-item {
            padding: 6px 12px;
            color: #c9d1d9;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .car-context-menu-item:hover {
            background: rgba(88, 166, 255, 0.15);
            color: #58a6ff;
        }
        
        .car-context-menu-item:active {
            background: rgba(88, 166, 255, 0.25);
        }
        
        /* Navigation Tabs Styles */
        .ribbon-navigation {
            margin: -20px -20px 0 -20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            height: 40px;
        }
        
        .nav-tab {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-bottom: 2px solid transparent;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 36px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .nav-tab:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
        }
        
        .nav-tab.active {
            background: rgba(88, 166, 255, 0.15);
            color: #58a6ff;
            border-bottom-color: #58a6ff;
        }
        
        .nav-tab.active::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #58a6ff 0%, #79c0ff 100%);
        }
        
        .tab-content {
            padding: 20px;
            display: none;
        }
        
        .tab-content.active,
        #extractor-content {
            display: block;
        }
        
        .tab-content h3 {
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .tab-content p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 10px;
        }
        
        /* Help Content Styles */
        .help-content {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }
        
        .help-section {
            margin-bottom: 20px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border-left: 3px solid #58a6ff;
        }
        
        .help-section h4 {
            color: #58a6ff;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            margin-top: 0;
        }
        
        .help-section p {
            margin-bottom: 6px;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .help-section code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 10px;
            color: #79c0ff;
        }
        
        .help-contact {
            margin-top: 20px;
            padding: 12px;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.3);
        }
        
        .help-contact h4 {
            color: #667eea;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            margin-top: 0;
        }
        
        .help-contact p {
            font-size: 11px;
            margin-bottom: 4px;
        }
        
        .help-contact strong {
            color: #ffffff;
        }
    `);

    let extractionInProgress = false;
    let shouldStop = false;
    let isPaused = false;
    let extractedData = [];
    let currentCarIndex = 0;
    let carLinks = [];
    let selectedCarId = null;
    let completedExtractions = 0; // Counter for concurrent processing

    // Function to minimize the ribbon
    function minimizeRibbon() {
        const ribbon = document.getElementById('car-extractor-ribbon');
        const minimizedBtn = document.getElementById('ribbon-minimized-btn');
        const body = document.body;
        
        if (ribbon && minimizedBtn) {
            ribbon.style.display = 'none';
            minimizedBtn.style.display = 'flex';
            body.classList.add('ribbon-minimized');
        }
    }

    // Function to maximize the ribbon
    function maximizeRibbon() {
        const ribbon = document.getElementById('car-extractor-ribbon');
        const minimizedBtn = document.getElementById('ribbon-minimized-btn');
        const body = document.body;
        
        if (ribbon && minimizedBtn) {
            ribbon.style.display = 'block';
            minimizedBtn.style.display = 'none';
            body.classList.remove('ribbon-minimized');
        }
    }

    // Function to switch between tabs
    function switchTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all content sections
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Activate selected tab
        document.getElementById(tabName + '-tab').classList.add('active');
        document.getElementById(tabName + '-content').style.display = 'block';
    }

    // Function to create context menu for individual CAR refresh
    function createContextMenu() {
        const contextMenu = document.createElement('div');
        contextMenu.id = 'car-context-menu';
        contextMenu.className = 'car-context-menu';
        contextMenu.innerHTML = `
            <div class="car-context-menu-item" id="refresh-car-item">[R] Refresh CAR</div>
        `;
        document.body.appendChild(contextMenu);
        
        // Add click listener for refresh action
        document.getElementById('refresh-car-item').addEventListener('click', refreshSelectedCar);
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.car-context-menu')) {
                contextMenu.style.display = 'none';
            }
        });
        
        // Prevent default context menu on the ribbon
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#car-extractor-ribbon')) {
                e.preventDefault();
            }
        });
    }

    // Function to show context menu for a CAR entry
    function showContextMenu(event, carId) {
        event.preventDefault();
        event.stopPropagation();
        
        selectedCarId = carId;
        const contextMenu = document.getElementById('car-context-menu');
        
        if (contextMenu) {
            contextMenu.style.display = 'block';
            contextMenu.style.left = event.pageX + 'px';
            contextMenu.style.top = event.pageY + 'px';
        }
    }

    // Function to refresh a specific CAR
    async function refreshSelectedCar() {
        if (!selectedCarId) return;
        
        const contextMenu = document.getElementById('car-context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        
        console.log(`🔄 Refreshing CAR: ${selectedCarId}`);
        updateStatus(`Refreshing ${selectedCarId}...`);
        
        // Find the CAR link from our stored links
        const carLink = carLinks.find(link => link.carId === selectedCarId);
        if (!carLink) {
            console.error(`CAR link not found for ${selectedCarId}`);
            updateStatus(`[ERROR] Could not find link for ${selectedCarId}`);
            return;
        }
        
        // Update the entry to show loading state
        const entryDiv = document.getElementById(`car-entry-${selectedCarId}`);
        if (entryDiv) {
            entryDiv.className = 'car-entry loading';
            entryDiv.innerHTML = `
                <div class="car-id">${selectedCarId}</div>
                <div class="car-details">Refreshing...</div>
            `;
        }
        
        try {
            // Process the single CAR
            await processCarLink(carLink, 0, 1, true); // Pass true for refresh mode
            updateStatus(`[OK] Refreshed ${selectedCarId}`);
        } catch (error) {
            console.error('Error refreshing CAR:', error);
            updateStatus(`[ERROR] Failed to refresh ${selectedCarId}`);
            
            // Update entry with error
            if (entryDiv) {
                entryDiv.className = 'car-entry error';
                entryDiv.innerHTML = `
                    <div class="car-id">${selectedCarId}</div>
                    <div class="car-details" style="color: #fca5a5;">Error: Failed to refresh</div>
                `;
            }
        }
        
        selectedCarId = null;
    }

    // Helper function to format today's date for remarks
    function formatTodayForRemarks() {
        try {
            const today = new Date();
            
            // Format as "DD MMM" (e.g., "02 Sep")
            const day = today.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[today.getMonth()];
            
            return `${day} ${month}`;
        } catch (error) {
            console.log('Error formatting today\'s date:', error);
            return 'Today'; // Fallback
        }
    }

    // Function to find all CAR links on the current page
    function findCarLinks() {
        console.log('Starting to find CAR links...');
        
        // Look for CAR number links in the table
        const links = [];
        
        // Method 1: Find CAR number links directly
        console.log('Method 1: Looking for CAR number links...');
        const carLinks = Array.from(document.querySelectorAll('a'))
            .filter(link => {
                const text = link.textContent.trim();
                const isCarLink = /^CAR-\d+$/.test(text);
                console.log(`Link text: "${text}", matches CAR pattern: ${isCarLink}, href: ${link.href}`);
                return isCarLink;
            });
        
        console.log(`Found ${carLinks.length} CAR number links`);
        
        carLinks.forEach((link, index) => {
            const carId = link.textContent.trim();
            console.log(`CAR link ${index + 1}: ${carId} -> ${link.href}`);
            
            links.push({
                carId: carId,
                url: link.href,
                element: link,
                method: 'car-number-link'
            });
        });
        
        // Method 2: Look in table cells for CAR patterns
        console.log('Method 2: Looking in table cells...');
        const tableCells = document.querySelectorAll('td, th');
        console.log(`Found ${tableCells.length} table cells to check`);
        
        tableCells.forEach((cell, index) => {
            const cellText = cell.textContent.trim();
            const carMatch = cellText.match(/^CAR-\d+$/);
            if (carMatch) {
                console.log(`Cell ${index}: Found CAR ${carMatch[0]}`);
                
                // Look for links within this cell
                const cellLinks = cell.querySelectorAll('a');
                if (cellLinks.length > 0) {
                    const link = cellLinks[0];
                    const carId = carMatch[0];
                    
                    if (!links.find(l => l.carId === carId)) {
                        console.log(`  Adding link: ${link.href}`);
                        links.push({
                            carId: carId,
                            url: link.href,
                            element: link,
                            method: 'table-cell'
                        });
                    }
                }
            }
        });
        
        console.log(`Total unique CAR links found: ${links.length}`);
        links.forEach((link, index) => {
            console.log(`${index + 1}. ${link.carId} - ${link.url} (method: ${link.method})`);
        });
        
        return links;
    }

    // Function to extract data from the current CAR details page
    function extractDataFromCurrentPage() {
        console.log('Starting data extraction from current page...');
        
        const data = {
            carId: '',
            raisedDate: '',
            stageOwner: '',
            targetDate: '',
            status: '',
            remarks: '',
            error: null
        };

        try {
            // Try to get CAR ID from URL or page
            console.log('Extracting CAR ID...');
            const urlMatch = window.location.href.match(/\/([A-Fa-f0-9-]+)#!/);
            if (urlMatch) {
                // Look for CAR ID on the page
                const pageText = document.body.textContent;
                const carMatch = pageText.match(/CAR-\d+/);
                if (carMatch) {
                    data.carId = carMatch[0];
                    console.log('Found CAR ID:', data.carId);
                }
            }

            // Extract Raised Date
            console.log('Extracting raised date...');
            const allLabels = document.querySelectorAll('div.details-label, .g-label, label');
            console.log(`Found ${allLabels.length} label elements`);
            
            allLabels.forEach((label, index) => {
                const labelText = (label.textContent || label.innerText).trim().toLowerCase();
                if (labelText.includes('raised date') || labelText === 'raised date:') {
                    console.log(`Found raised date label at index ${index}:`, labelText);
                    let valueElement = label.nextElementSibling;
                    if (!valueElement) {
                        valueElement = label.parentElement.querySelector('.staticText, .g-value');
                    }
                    if (!valueElement && label.parentElement) {
                        const parentText = label.parentElement.textContent;
                        const dateMatch = parentText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
                        if (dateMatch) {
                            data.raisedDate = dateMatch[0];
                            console.log('Found raised date from parent:', data.raisedDate);
                        }
                    } else if (valueElement) {
                        const dateMatch = valueElement.textContent.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
                        if (dateMatch) {
                            data.raisedDate = dateMatch[0];
                            console.log('Found raised date from value element:', data.raisedDate);
                        }
                    }
                }
            });

            // Extract stage information
            console.log('Extracting stage information...');
            const stages = document.querySelectorAll("li.stage-li");
            console.log(`Found ${stages.length} stage elements`);
            
            let investigationCompleted = false;
            let investigationData = {};
            let qaData = {};
            let qaCompleted = false;
            let hqaData = {};

            stages.forEach((stage, stageIndex) => {
                console.log(`Processing stage ${stageIndex}...`);
                
                function findSiblingData(labelText) {
                    const label = Array.from(stage.querySelectorAll('div.details-label'))
                        .find(el => el.textContent.trim() === labelText);
                    if (label && label.nextElementSibling) {
                        const staticText = label.nextElementSibling.querySelector('.staticText');
                        return staticText ? staticText.textContent.trim() : label.nextElementSibling.textContent.trim();
                    }
                    return null;
                }

                function findStaticTextData(labelText) {
                    const label = Array.from(stage.querySelectorAll('div.details-label'))
                        .find(el => el.textContent.trim() === labelText);
                    if (label && label.nextElementSibling) {
                        const staticTextContainer = label.nextElementSibling.querySelector('.staticTextContainer');
                        return staticTextContainer ? staticTextContainer.textContent.trim() : null;
                    }
                    return null;
                }

                const stageText = stage.textContent || stage.innerText;
                const lowerStageText = stageText.toLowerCase();
                console.log(`Stage ${stageIndex} text contains:`, lowerStageText.substring(0, 200));

                // Detection 1: Investigation stage
                if (lowerStageText.includes('investigation')) {
                    console.log('Found investigation stage');
                    const owner = findSiblingData("Stage Owner:");
                    const targetDate = findStaticTextData("Target Date");
                    const completedDate = findSiblingData("Completed date");
                    const status = findSiblingData("Status:");

                    investigationData = {
                        owner: owner ? owner.replace(/Cancel|Save/g, '').trim() : '',
                        targetDate: targetDate ? targetDate.replace(/Cancel|Save/g, '').trim() : 
                                   (completedDate ? completedDate.replace(/Cancel|Save/g, '').trim() : ''),
                        status: status ? status.replace(/Cancel|Save/g, '').trim() : ''
                    };
                    
                    console.log('Investigation data:', investigationData);

                    if (completedDate || (status && status.toLowerCase().includes('complete'))) {
                        investigationCompleted = true;
                        console.log('Investigation marked as completed');
                    }
                }

                // Detection 2: QA Follow-up stage (more flexible detection)
                if ((lowerStageText.includes('qa') && lowerStageText.includes('follow')) || 
                    (lowerStageText.includes('quality') && lowerStageText.includes('follow')) ||
                    lowerStageText.includes('qa follow-up')) {
                    console.log('Found QA follow-up stage');
                    const owner = findSiblingData("Stage Owner:");
                    const targetDate = findStaticTextData("Target Date");
                    const completedDate = findSiblingData("Completed date");
                    const status = findSiblingData("Status:");

                    qaData = {
                        owner: owner ? owner.replace(/Cancel|Save/g, '').trim() : '',
                        targetDate: targetDate ? targetDate.replace(/Cancel|Save/g, '').trim() : 
                                   (completedDate ? completedDate.replace(/Cancel|Save/g, '').trim() : ''),
                        status: status ? status.replace(/Cancel|Save/g, '').trim() : ''
                    };
                    
                    console.log('QA data:', qaData);
                    
                    if (completedDate || (status && status.toLowerCase().includes('complete'))) {
                        qaCompleted = true;
                        console.log('QA Follow-up marked as completed');
                    }
                }

                // Detection 3: HQA Closure stage (enhanced detection)
                if ((lowerStageText.includes('hqa') && (lowerStageText.includes('closure') || lowerStageText.includes('close') || lowerStageText.includes('final'))) ||
                    lowerStageText.includes('hqa closure') ||
                    (lowerStageText.includes('headquarters') && lowerStageText.includes('closure'))) {
                    console.log('Found HQA closure stage');
                    const owner = findSiblingData("Stage Owner:");
                    const targetDate = findStaticTextData("Target Date");
                    const completedDate = findSiblingData("Completed date");
                    const status = findSiblingData("Status:");

                    hqaData = {
                        owner: owner ? owner.replace(/Cancel|Save/g, '').trim() : '',
                        targetDate: targetDate ? targetDate.replace(/Cancel|Save/g, '').trim() : 
                                   (completedDate ? completedDate.replace(/Cancel|Save/g, '').trim() : ''),
                        status: status ? status.replace(/Cancel|Save/g, '').trim() : ''
                    };
                    
                    console.log('HQA data:', hqaData);
                }
            });

            // Determine which stage to show (priority: HQA Closure > QA Follow-up > Investigation)
            console.log('=== STAGE DECISION LOGIC ===');
            console.log('Investigation data:', investigationData);
            console.log('Investigation completed:', investigationCompleted);
            console.log('QA data:', qaData);
            console.log('QA completed:', qaCompleted);
            console.log('HQA data:', hqaData);
            
            // Priority 1: HQA Closure (if available and has owner)
            if (hqaData.owner) {
                data.stageOwner = hqaData.owner;
                data.targetDate = hqaData.targetDate;
                data.status = 'HQA Closure';
                
                const todayFormatted = formatTodayForRemarks();
                data.remarks = `${todayFormatted}: HQA Closure ${hqaData.owner}`;
                
                console.log('✅ Using HQA Closure data');
            } 
            // Priority 2: QA Follow-up (if available and has owner)
            else if (qaData.owner) {
                data.stageOwner = qaData.owner;
                data.targetDate = qaData.targetDate;
                data.status = 'QA Follow-up';
                
                const todayFormatted = formatTodayForRemarks();
                data.remarks = `${todayFormatted}: QA Follow-up ${qaData.owner}`;
                
                console.log('✅ Using QA Follow-up data');
            } 
            // Priority 3: Investigation (if available and has owner)
            else if (investigationData.owner) {
                data.stageOwner = investigationData.owner;
                data.targetDate = investigationData.targetDate;
                data.status = 'Investigation';
                
                const todayFormatted = formatTodayForRemarks();
                data.remarks = `${todayFormatted}: Investigation ${investigationData.owner}`;
                
                console.log('✅ Using Investigation data');
            }
            else {
                console.log('❌ No valid stage data found');
            }

            console.log('Final extracted data:', data);

        } catch (error) {
            console.error('Error during data extraction:', error);
            data.error = error.message;
        }

        return data;
    }

    // Function to handle data extraction in a CAR details window
    function handleCarDetailsWindow() {
        console.log('🔍 CAR details window loaded, checking for extraction task...');
        console.log('Window name:', window.name);
        
        // Try to find the extraction task that matches this window
        const allKeys = Object.keys(sessionStorage);
        const extractionKeys = allKeys.filter(key => key.startsWith('carExtraction_'));
        
        console.log('Available extraction keys:', extractionKeys);
        
        if (extractionKeys.length === 0) {
            console.log('❌ No extraction task found for this window');
            console.log('All sessionStorage keys:', allKeys);
            return;
        }
        
        // Find the most recent extraction task or one that matches the window name
        let extractionInfo = null;
        let extractionKey = null;
        
        if (window.name && window.name.includes('car_window_')) {
            // Try to match by window name
            const windowId = window.name.replace('car_window_', '');
            extractionKey = `carExtraction_${windowId}`;
            if (sessionStorage.getItem(extractionKey)) {
                extractionInfo = JSON.parse(sessionStorage.getItem(extractionKey));
                console.log('✅ Found extraction task by window name:', extractionInfo);
            }
        }
        
        // If not found by window name, use the first available one
        if (!extractionInfo && extractionKeys.length > 0) {
            extractionKey = extractionKeys[0];
            extractionInfo = JSON.parse(sessionStorage.getItem(extractionKey));
            console.log('📋 Using first available extraction task:', extractionInfo);
        }
        
        if (!extractionInfo) {
            console.log('❌ Could not find valid extraction info');
            return;
        }
        
        // Mark this extraction as being processed to avoid conflicts
        extractionInfo.processing = true;
        sessionStorage.setItem(extractionKey, JSON.stringify(extractionInfo));
        
        // Wait for page to load completely, then extract data
        setTimeout(() => {
            console.log(`🚀 Extracting data for ${extractionInfo.carId} (${extractionInfo.extractionId})...`);
            console.log('Current page title:', document.title);
            console.log('Page fully loaded, checking for stage elements...');
            
            // Check if stage elements exist
            const stages = document.querySelectorAll("li.stage-li");
            console.log(`Found ${stages.length} stage elements`);
            
            const carData = extractDataFromCurrentPage();
            carData.carId = extractionInfo.carId; // Ensure correct CAR ID
            
            console.log(`📊 Extracted data for ${extractionInfo.carId}:`, carData);
            
            // Send data back to parent window
            if (window.opener && !window.opener.closed) {
                console.log('📤 Sending data to parent window...');
                window.opener.postMessage({
                    type: 'CAR_DATA_EXTRACTED',
                    extractionId: extractionInfo.extractionId,
                    carData: carData
                }, '*');
                
                console.log('✅ Data sent to parent window');
                
                // Clean up this extraction task immediately
                sessionStorage.removeItem(extractionKey);
                
                // Close the window after a brief delay
                setTimeout(() => {
                    console.log('🔚 Closing popup window...');
                    window.close();
                }, 1000);
            } else {
                console.error('❌ Parent window not available');
                sessionStorage.removeItem(extractionKey);
                window.close();
            }
            
        }, 5000); // Wait 5 seconds for page to fully load
    }

    // Function to process a single CAR by opening it in a new window
    async function processCarLink(carLink, index, total, isRefresh = false) {
        return new Promise((resolve) => {
            if (!isRefresh) {
                updateStatus(`Opening ${carLink.carId} (${index + 1}/${total}) in new window...`);
                // Add loading entry to ribbon
                addCarEntry(carLink.carId, null, true);
            }
            
            console.log(`Opening ${carLink.carId} in new window: ${carLink.url}`);
            
            // Create a unique identifier for this extraction using more specificity
            const extractionId = `${Date.now()}_${index}_${carLink.carId.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            // Store extraction info that the new window can access
            sessionStorage.setItem(`carExtraction_${extractionId}`, JSON.stringify({
                carId: carLink.carId,
                index: index,
                total: total,
                extractionId: extractionId,
                isRefresh: isRefresh
            }));
            
            // Update status to show background processing
            if (!isRefresh) {
                updateStatus(`Processing ${carLink.carId} in background... (${index + 1}/${total})`);
            }
            
            // Open the CAR details page in a new window with unique window name (hidden)
            const detailsUrl = carLink.url + '#!/details';
            const windowName = `car_window_${extractionId}`;
            const newWindow = window.open(detailsUrl, windowName, 'width=1,height=1,left=-1000,top=-1000,resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,directories=no,status=no');
            
            // Hide the window immediately after opening
            if (newWindow) {
                try {
                    // Move window off-screen and minimize it
                    newWindow.moveTo(-2000, -2000);
                    newWindow.resizeTo(1, 1);
                    // Try to minimize the window (browser dependent)
                    if (newWindow.minimize) {
                        newWindow.minimize();
                    }
                } catch (error) {
                    console.log('Could not fully hide window (browser security):', error);
                }
            }
            
            let resolved = false; // Flag to prevent multiple resolutions
            
            // Set up a message listener to receive data from the new window
            const messageHandler = (event) => {
                // More specific check for this exact extraction
                if (event.data && 
                    event.data.type === 'CAR_DATA_EXTRACTED' && 
                    event.data.extractionId === extractionId &&
                    !resolved) {
                    
                    resolved = true; // Mark as resolved to prevent duplicates
                    
                    console.log(`✅ Received data for ${carLink.carId} (${extractionId}):`, event.data.carData);
                    
                    // Handle refresh mode differently
                    if (isRefresh) {
                        // Update existing data in extractedData array
                        const existingIndex = extractedData.findIndex(data => data.carId === carLink.carId);
                        if (existingIndex !== -1) {
                            extractedData[existingIndex] = event.data.carData;
                        } else {
                            extractedData.push(event.data.carData);
                        }
                    } else {
                        // Normal mode - add to array and update progress
                        extractedData.push(event.data.carData);
                        completedExtractions++;
                        updateProgress(completedExtractions, carLinks.length);
                    }
                    
                    // Update the ribbon with extracted data
                    updateCarEntry(carLink.carId, event.data.carData);
                    
                    // Clean up the message listener first
                    window.removeEventListener('message', messageHandler);
                    
                    // Immediate cleanup and resolution
                    sessionStorage.removeItem(`carExtraction_${extractionId}`);
                    
                    // Close the new window
                    if (newWindow && !newWindow.closed) {
                        newWindow.close();
                    }
                    
                    // Resolve immediately
                    resolve();
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Set up a timeout in case the new window doesn't respond
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.log(`⏰ Timeout reached for ${carLink.carId} (${extractionId})`);
                    
                    if (newWindow && !newWindow.closed) {
                        newWindow.close();
                    }
                    window.removeEventListener('message', messageHandler);
                    sessionStorage.removeItem(`carExtraction_${extractionId}`);
                    
                    // Add error entry if we didn't get data
                    const errorData = {
                        carId: carLink.carId,
                        error: 'Timeout - window did not respond'
                    };
                    updateCarEntry(carLink.carId, errorData);
                    
                    if (!isRefresh) {
                        extractedData.push(errorData);
                        completedExtractions++;
                        updateProgress(completedExtractions, carLinks.length);
                    }
                    
                    resolve();
                }
            }, 20000); // Increased to 20 second timeout
            
            // Also listen for window close events to clean up
            const checkWindowClosed = setInterval(() => {
                if (newWindow.closed && !resolved) {
                    resolved = true;
                    clearInterval(checkWindowClosed);
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', messageHandler);
                    sessionStorage.removeItem(`carExtraction_${extractionId}`);
                    
                    console.log(`🔴 Window closed before data received for ${carLink.carId}`);
                    const errorData = {
                        carId: carLink.carId,
                        error: 'Window closed before data extraction'
                    };
                    updateCarEntry(carLink.carId, errorData);
                    
                    if (!isRefresh) {
                        extractedData.push(errorData);
                        completedExtractions++;
                        updateProgress(completedExtractions, carLinks.length);
                    }
                    
                    resolve();
                }
            }, 1000);
        });
    }

    // Function to add a CAR entry to the ribbon
    function addCarEntry(carId, data, isLoading = false) {
        const resultsDiv = document.getElementById('car-results');
        
        let entryClass = 'car-entry';
        if (isLoading) entryClass += ' loading';
        if (data && data.error) entryClass += ' error';
        
        const entryDiv = document.createElement('div');
        entryDiv.className = entryClass;
        entryDiv.id = `car-entry-${carId}`;
        
        if (isLoading) {
            entryDiv.innerHTML = `
                <div class="car-id">${carId}</div>
                <div class="car-details">Loading...</div>
            `;
        } else if (data && data.error) {
            entryDiv.innerHTML = `
                <div class="car-id">${carId}</div>
                <div class="car-details" style="color: #fca5a5;">Error: ${data.error}</div>
            `;
        } else if (data) {
            entryDiv.innerHTML = `
                <div class="car-id">${carId}</div>
                <div class="car-details">
                    <div><strong>Raised:</strong> ${data.raisedDate || 'Unknown'}</div>
                    <div><strong>Owner:</strong> ${data.stageOwner || 'Unknown'}</div>
                    <div><strong>Target:</strong> ${data.targetDate || 'Unknown'}</div>
                    <div><strong>Status:</strong> ${data.status || 'Unknown'}</div>
                    <div><strong>Remarks:</strong> ${data.remarks || 'Unknown'}</div>
                </div>
            `;
        }
        
        // Add right-click context menu functionality
        entryDiv.addEventListener('contextmenu', (e) => showContextMenu(e, carId));
        
        resultsDiv.appendChild(entryDiv);
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }

    // Function to update an existing CAR entry
    function updateCarEntry(carId, data) {
        const entryDiv = document.getElementById(`car-entry-${carId}`);
        if (entryDiv) {
            entryDiv.className = 'car-entry' + (data.error ? ' error' : '');
            
            if (data.error) {
                entryDiv.innerHTML = `
                    <div class="car-id">${carId}</div>
                    <div class="car-details" style="color: #fca5a5;">Error: ${data.error}</div>
                `;
            } else {
                entryDiv.innerHTML = `
                    <div class="car-id">${carId}</div>
                    <div class="car-details">
                        <div><strong>Raised:</strong> ${data.raisedDate || 'Unknown'}</div>
                        <div><strong>Owner:</strong> ${data.stageOwner || 'Unknown'}</div>
                        <div><strong>Target:</strong> ${data.targetDate || 'Unknown'}</div>
                        <div><strong>Status:</strong> ${data.status || 'Unknown'}</div>
                        <div><strong>Remarks:</strong> ${data.remarks || 'Unknown'}</div>
                    </div>
                `;
            }
            
            // Re-add right-click context menu functionality
            entryDiv.removeEventListener('contextmenu', entryDiv._contextMenuHandler);
            entryDiv._contextMenuHandler = (e) => showContextMenu(e, carId);
            entryDiv.addEventListener('contextmenu', entryDiv._contextMenuHandler);
        }
        
        // Also log the update for debugging
        console.log(`Updated ribbon entry for ${carId}:`, data);
    }

    // Function to update status message
    function updateStatus(message) {
        const statusElement = document.getElementById('status-info');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // Function to update progress bar
    function updateProgress(current, total) {
        const progressElement = document.getElementById('progress-info');
        if (progressElement) {
            if (total === 0) {
                progressElement.textContent = 'Ready to extract CAR data';
            } else {
                progressElement.textContent = `Progress: ${current}/${total} (${Math.round((current/total)*100)}%)`;
            }
        }
    }

    // Main extraction function
    async function startExtraction() {
        if (extractionInProgress && !isPaused) return;
        
        // Update button states
        updateButtonStates('extracting');
        
        if (isPaused) {
            // Resume extraction
            isPaused = false;
            updateStatus(`[RESUME] Resuming extraction from CAR ${currentCarIndex + 1}/${carLinks.length}...`);
            console.log('=== RESUMING EXTRACTION ===');
        } else {
            // Start new extraction
            extractionInProgress = true;
            shouldStop = false;
            isPaused = false;
            extractedData = [];
            currentCarIndex = 0;
            completedExtractions = 0; // Reset counter for new extraction
            
            updateStatus('Finding CAR links...');
            
            // Clear previous results first
            document.getElementById('car-results').innerHTML = '';
            
            console.log('=== STARTING CAR LINK DETECTION ===');
            console.log('Page URL:', window.location.href);
            console.log('Page title:', document.title);
            
            carLinks = findCarLinks();
            
            if (carLinks.length === 0) {
                updateStatus('[ERROR] No CAR links found on this page');
                console.log('=== NO LINKS FOUND ===');
                
                extractionInProgress = false;
                updateButtonStates('idle');
                return;
            }
            
            updateStatus(`[OK] Found ${carLinks.length} CARs. Starting window-based extraction...`);
            console.log('=== STARTING EXTRACTION ===');
        }
        
        // Process CARs with concurrent windows (max 5 at a time)
        const CONCURRENT_LIMIT = 5;
        let processedCount = 0;
        
        // Function to process CARs in batches
        async function processBatch(batchStart, batchSize) {
            const promises = [];
            const batchEnd = Math.min(batchStart + batchSize, carLinks.length);
            
            console.log(`🚀 Starting batch ${Math.floor(batchStart/CONCURRENT_LIMIT) + 1}: CARs ${batchStart + 1}-${batchEnd} (${batchEnd - batchStart} items)`);
            
            for (let i = batchStart; i < batchEnd; i++) {
                if (shouldStop) {
                    console.log('[STOP] Batch processing stopped by user');
                    break;
                }
                
                if (isPaused) {
                    currentCarIndex = i;
                    updateStatus(`[PAUSE] Extraction paused at CAR ${i + 1}/${carLinks.length}`);
                    updateButtonStates('paused');
                    return;
                }
                
                console.log(`🔄 Queuing CAR ${i + 1}/${carLinks.length}: ${carLinks[i].carId} for concurrent processing`);
                promises.push(processCarLink(carLinks[i], i, carLinks.length));
            }
            
            // Wait for all CARs in this batch to complete
            if (promises.length > 0) {
                updateStatus(`[PROCESSING] Running ${promises.length} concurrent extractions...`);
                await Promise.all(promises);
                processedCount += promises.length;
                console.log(`✅ Completed batch ${Math.floor(batchStart/CONCURRENT_LIMIT) + 1}: ${promises.length} CARs processed`);
                updateStatus(`[PROGRESS] Completed ${processedCount}/${carLinks.length} CARs`);
            }
        }
        
        // Process all CARs in batches starting from currentCarIndex
        for (let batchStart = currentCarIndex; batchStart < carLinks.length; batchStart += CONCURRENT_LIMIT) {
            if (shouldStop) {
                updateStatus('[STOP] Extraction stopped by user');
                break;
            }
            
            if (isPaused) {
                currentCarIndex = batchStart;
                updateStatus(`[PAUSE] Extraction paused at CAR ${batchStart + 1}/${carLinks.length}`);
                updateButtonStates('paused');
                return;
            }
            
            currentCarIndex = batchStart;
            await processBatch(batchStart, CONCURRENT_LIMIT);
            
            // Brief pause between batches to prevent overwhelming the browser
            if (batchStart + CONCURRENT_LIMIT < carLinks.length) {
                console.log('💤 Brief pause between batches...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (!shouldStop && !isPaused) {
            updateStatus(`[COMPLETE] Extraction complete! Processed ${extractedData.length} CARs`);
            console.log('=== EXTRACTION COMPLETE ===');
            extractionInProgress = false;
            updateButtonStates('completed');
        }
    }

    // Function to pause extraction
    function pauseExtraction() {
        isPaused = true;
        updateStatus(`[PAUSE] Pausing extraction after current CAR...`);
        console.log('=== PAUSING EXTRACTION ===');
    }

    // Function to stop extraction
    function stopExtraction() {
        shouldStop = true;
        isPaused = false;
        extractionInProgress = false;
        updateStatus('[STOP] Stopping extraction...');
        console.log('=== STOPPING EXTRACTION ===');
        updateButtonStates('idle');
    }

    // Function to update button states
    function updateButtonStates(state) {
        const startBtn = document.getElementById('start-extraction-btn');
        const pauseBtn = document.getElementById('pause-extraction-btn');
        const stopBtn = document.getElementById('stop-extraction-btn');
        const exportBtn = document.getElementById('export-results-btn');
        const clearBtn = document.getElementById('clear-results-btn');
        
        switch (state) {
            case 'idle':
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Start';
                    startBtn.style.background = '#28a745';
                }
                if (pauseBtn) pauseBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = true;
                if (exportBtn) exportBtn.disabled = extractedData.length === 0;
                if (clearBtn) clearBtn.disabled = false;
                break;
                
            case 'extracting':
                if (startBtn) {
                    startBtn.disabled = true;
                    startBtn.textContent = 'Running...';
                    startBtn.style.background = '#6c757d';
                }
                if (pauseBtn) pauseBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = false;
                if (exportBtn) exportBtn.disabled = true;
                if (clearBtn) clearBtn.disabled = true;
                break;
                
            case 'paused':
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Resume';
                    startBtn.style.background = '#17a2b8';
                }
                if (pauseBtn) pauseBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = false;
                if (exportBtn) exportBtn.disabled = extractedData.length === 0;
                if (clearBtn) clearBtn.disabled = false;
                break;
                
            case 'completed':
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Start';
                    startBtn.style.background = '#28a745';
                }
                if (pauseBtn) pauseBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = true;
                if (exportBtn) exportBtn.disabled = extractedData.length === 0;
                if (clearBtn) clearBtn.disabled = false;
                break;
        }
    }

    // Function to clear results
    function clearResults() {
        document.getElementById('car-results').innerHTML = '';
        extractedData = [];
        currentCarIndex = 0;
        carLinks = [];
        completedExtractions = 0; // Reset completion counter
        updateStatus('Results cleared - ready for new extraction');
        updateButtonStates('idle');
        
        // Update progress info
        updateProgress(0, 0);
    }

    // Function to handle logout
    function logout() {
        if (confirm('Are you sure you want to logout? You will need to enter your credentials again next time.')) {
            console.log('User logging out...');
            clearStoredCredentials();
            
            // Show logout message
            const logoutDiv = document.createElement('div');
            logoutDiv.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); 
                            color: white; padding: 20px; border-radius: 8px; 
                            box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 10007; 
                            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                            text-align: center;">
                    <h3 style="margin: 0 0 15px 0;">[LOGOUT] Logged Out</h3>
                    <p style="margin: 0;">You have been successfully logged out. Refreshing page...</p>
                </div>
            `;
            document.body.appendChild(logoutDiv);
            
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }
    function debugPage() {
        console.log('=== PAGE DEBUG INFO ===');
        console.log('URL:', window.location.href);
        console.log('Title:', document.title);
        
        // Check if this is a CAR details page
        if (window.location.href.includes('#!/details')) {
            console.log('=== CAR DETAILS PAGE DEBUG ===');
            
            // Show stage detection
            const stages = document.querySelectorAll("li.stage-li");
            console.log(`Found ${stages.length} stage elements`);
            
            stages.forEach((stage, index) => {
                const stageText = (stage.textContent || stage.innerText).toLowerCase();
                console.log(`Stage ${index + 1}:`);
                console.log(`  Text: ${stageText.substring(0, 150)}...`);
                console.log(`  Investigation match: ${stageText.includes('investigation')}`);
                console.log(`  QA Follow-up match: ${stageText.includes('qa') && stageText.includes('follow')}`);
                console.log(`  HQA Closure match: ${stageText.includes('hqa') && (stageText.includes('closure') || stageText.includes('close'))}`);
                
                // Check for stage owner
                const ownerLabel = stage.querySelector('div.details-label');
                if (ownerLabel && ownerLabel.textContent.includes('Stage Owner')) {
                    const ownerValue = ownerLabel.nextElementSibling;
                    console.log(`  Stage Owner: ${ownerValue ? ownerValue.textContent.trim() : 'Not found'}`);
                }
            });
            
            // Test extraction
            console.log('=== TESTING EXTRACTION ===');
            const testData = extractDataFromCurrentPage();
            console.log('Test extraction result:', testData);
        } else {
            // Show page structure for list pages
            console.log('Tables:', document.querySelectorAll('table').length);
            console.log('Rows:', document.querySelectorAll('tr').length);
            console.log('Links:', document.querySelectorAll('a').length);
            
            // Show all CAR references
            const pageText = document.body.textContent;
            const carMatches = pageText.match(/CAR-\d+/g);
            console.log('CAR IDs found:', carMatches);
            
            // Show first 10 links
            const links = document.querySelectorAll('a');
            console.log('First 10 links:');
            for (let i = 0; i < Math.min(10, links.length); i++) {
                console.log(`  ${i + 1}. "${links[i].textContent.trim()}" -> ${links[i].href}`);
            }
        }
        
        updateStatus('Debug info logged to console - press F12 to view');
    }

    // Function to export results
    function exportResults() {
        if (extractedData.length === 0) {
            alert('No data to export. Please run extraction first.');
            return;
        }
        
        console.log('=== EXPORTING RESULTS ===');
        console.log(`Exporting ${extractedData.length} records`);
        
        // Create CSV header
        let csvContent = 'CAR No,Raised Date,Stage Owner,Target Date,Status,Remarks\n';
        
        // Add data rows
        let successfulExports = 0;
        extractedData.forEach((data, index) => {
            if (!data.error) {
                const row = [
                    data.carId || '',
                    data.raisedDate || '',
                    data.stageOwner || '',
                    data.targetDate || '',
                    data.status || '',
                    data.remarks || ''
                ].map(field => {
                    // Escape quotes and wrap in quotes
                    const escaped = String(field).replace(/"/g, '""');
                    return `"${escaped}"`;
                }).join(',');
                
                csvContent += row + '\n';
                successfulExports++;
                console.log(`Row ${index + 1}: ${data.carId} - ${data.stageOwner} - ${data.remarks}`);
            } else {
                console.log(`Skipping row ${index + 1} due to error: ${data.error}`);
            }
        });
        
        console.log(`Successfully exported ${successfulExports} rows out of ${extractedData.length} total`);
        
        // Create and download the file
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `car_data_${new Date().toISOString().split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            updateStatus(`[OK] Exported ${successfulExports} CARs to CSV file`);
            console.log('=== EXPORT COMPLETE ===');
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting data. Please check console for details.');
            updateStatus('[ERROR] Export failed');
        }
    }

    // Initialize the UI when the page loads
    async function init() {
        console.log('Initializing CAR Batch Extractor...');
        console.log('Current URL:', window.location.href);
        
        // First, verify access before doing anything else
        const accessResult = await verifyAccess();
        
        if (!accessResult.authorized) {
            console.log('Access denied:', accessResult.reason);
            showAccessDeniedMessage(accessResult.reason, accessResult.message);
            return; // Stop initialization
        }
        
        console.log('Access granted for user:', accessResult.user?.name || accessResult.user?.username);
        showAccessStatus(accessResult.user);
        
        // Check if we're on a CAR details page (has #!/details)
        if (window.location.href.includes('#!/details')) {
            console.log('Detected CAR details page');
            
            // Check if this is a popup window for data extraction
            if (window.opener) {
                console.log('This is a popup window, handling data extraction...');
                handleCarDetailsWindow();
                return;
            } else {
                console.log('This is not a popup window, skipping extraction');
                return;
            }
        }
        
        // Check if we're on the main CAR list page
        if (window.location.href.includes('/Reporting/ReportingManagement')) {
            console.log('Detected CAR list page');
            
            // Wait for the page to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => {
                        createUI();
                        updateButtonStates('idle'); // Initialize button states
                        
                        // Set up periodic access checks
                        setInterval(async () => {
                            const recheckResult = await verifyAccess();
                            if (!recheckResult.authorized && isAuthorized) {
                                // Access was revoked
                                console.log('Access revoked during session');
                                showAccessDeniedMessage(recheckResult.reason, recheckResult.message);
                                
                                // Hide the UI
                                const ribbon = document.getElementById('car-extractor-ribbon');
                                if (ribbon) ribbon.style.display = 'none';
                                
                                // Stop any ongoing extraction
                                stopExtraction();
                            }
                        }, CHECK_INTERVAL);
                    }, 1000);
                });
            } else {
                setTimeout(() => {
                    createUI();
                    updateButtonStates('idle'); // Initialize button states
                    
                    // Set up periodic access checks
                    setInterval(async () => {
                        const recheckResult = await verifyAccess();
                        if (!recheckResult.authorized && isAuthorized) {
                            // Access was revoked
                            console.log('Access revoked during session');
                            showAccessDeniedMessage(recheckResult.reason, recheckResult.message);
                            
                            // Hide the UI
                            const ribbon = document.getElementById('car-extractor-ribbon');
                            if (ribbon) ribbon.style.display = 'none';
                            
                            // Stop any ongoing extraction
                            stopExtraction();
                        }
                    }, CHECK_INTERVAL);
                }, 1000);
            }
        }
    }

    // Start the initialization
    init();

})();
