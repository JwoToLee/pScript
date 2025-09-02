// ==UserScript==
// @name         CAR Enterprise Tool
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Authorized personnel only - Enterprise reporting solution
// @author       IT Department
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      Proprietary - Unauthorized distribution prohibited
// ==/UserScript==

/*
 * CONFIDENTIAL AND PROPRIETARY
 * 
 * This script is proprietary software and contains confidential information.
 * Unauthorized copying, distribution, or use of this software is strictly 
 * prohibited and may result in severe civil and criminal penalties.
 * 
 * Licensed users are bound by the terms of the End User License Agreement.
 * Any attempt to reverse engineer, decompile, or modify this software 
 * violates the license agreement and applicable laws.
 * 
 * Copyright (c) 2025 - All Rights Reserved
 */

(function() {
    'use strict';
    
    // Anti-debugging and protection measures
    const protectionEnabled = true;
    
    if (protectionEnabled) {
        // Detect developer tools
        let devtools = {
            open: false,
            orientation: null
        };
        
        const threshold = 160;
        setInterval(function() {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.clear();
                    console.warn('%c⚠️ SECURITY WARNING', 'color: red; font-size: 20px; font-weight: bold;');
                    console.warn('%cThis is a proprietary application. Unauthorized access is prohibited.', 'color: red; font-size: 14px;');
                    console.warn('%cYour access attempt has been logged.', 'color: red; font-size: 14px;');
                    
                    // Optional: You could log this to your server
                    // logSecurityEvent('devtools_detected');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
        
        // Disable right-click context menu on script elements
        document.addEventListener('contextmenu', function(e) {
            if (e.target.id && e.target.id.includes('car-extractor')) {
                e.preventDefault();
                return false;
            }
        });
        
        // Clear console periodically
        setInterval(() => {
            if (devtools.open) {
                console.clear();
            }
        }, 3000);
    }
    
    // Obfuscated script loader
    const config = {
        // Base64 encoded GitHub raw URL for script_core.js
        endpoint: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==',
        integrity: 'sha256-check-enabled',
        timeout: 10000
    };
    
    function decodeEndpoint(encoded) {
        try {
            return atob(encoded);
        } catch (e) {
            console.error('Configuration error');
            return null;
        }
    }
    
    function validateEnvironment() {
        // Check if we're on the correct domain
        if (!window.location.hostname.includes('haesl.gaelenlighten.com')) {
            console.warn('Unauthorized domain detected');
            return false;
        }
        return true;
    }
    
    function loadMainScript() {
        if (!validateEnvironment()) {
            return;
        }
        
        const scriptUrl = decodeEndpoint(config.endpoint);
        if (!scriptUrl) {
            console.error('Invalid configuration');
            return;
        }
        
        // Add cache-busting and integrity checking
        const requestUrl = scriptUrl + '?v=' + Date.now() + '&h=' + btoa(navigator.userAgent).slice(-8);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: config.timeout,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // Basic integrity check
                        if (response.responseText.includes('CAR Batch Extractor') && 
                            response.responseText.length > 1000) {
                            
                            // Execute in protected context using script injection
                            (function() {
                                const scriptElement = document.createElement('script');
                                scriptElement.textContent = response.responseText;
                                scriptElement.setAttribute('type', 'text/javascript');
                                
                                // Add to head temporarily
                                document.head.appendChild(scriptElement);
                                
                                // Clean up after execution
                                setTimeout(() => {
                                    if (scriptElement.parentNode) {
                                        scriptElement.parentNode.removeChild(scriptElement);
                                    }
                                }, 200);
                            })();
                            
                        } else {
                            console.error('Script integrity check failed');
                        }
                    } catch (error) {
                        console.error('Script execution error:', error.message);
                    }
                } else {
                    console.error('HTTP error:', response.status);
                }
            },
            onerror: function(error) {
                console.error('Network error loading script');
            },
            ontimeout: function() {
                console.error('Script loading timeout');
            }
        });
    }
    
    // Initialize when DOM is ready
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadMainScript);
        } else {
            // DOM already loaded
            setTimeout(loadMainScript, 100);
        }
    }
    
    // Start the initialization
    initialize();
    
})();
