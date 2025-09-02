// ==UserScript==
// @name         CAR Tool Debug
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Debug version with detailed logging
// @author       Admin
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('🚀 CAR Tool Debug Loader starting...');
    console.log('Current URL:', window.location.href);
    console.log('Document ready state:', document.readyState);
    
    // Configuration
    const config = {
        endpoint: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==',
        timeout: 15000,
        maxRetries: 3,
        retryDelay: 2000
    };
    
    function decodeEndpoint(encoded) {
        try {
            const decoded = atob(encoded);
            console.log('🔗 Decoded URL:', decoded);
            return decoded;
        } catch (e) {
            console.error('❌ Configuration decode error:', e);
            return null;
        }
    }
    
    function validateEnvironment() {
        const isValid = window.location.hostname.includes('haesl.gaelenlighten.com');
        console.log('🌐 Environment validation:', isValid ? '✅ Valid' : '❌ Invalid');
        console.log('Current hostname:', window.location.hostname);
        return isValid;
    }
    
    function executeScript(scriptContent) {
        try {
            console.log('📝 Script content length:', scriptContent.length);
            console.log('📝 Script preview:', scriptContent.substring(0, 200) + '...');
            
            // Test if GM functions are available
            console.log('🔧 GM_addStyle available:', typeof GM_addStyle !== 'undefined');
            console.log('🔧 GM_getValue available:', typeof GM_getValue !== 'undefined');
            console.log('🔧 GM_setValue available:', typeof GM_setValue !== 'undefined');
            
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
            
            console.log('🔧 Script modified to use GM bridge');
            
            // Create a script element and inject it
            const scriptElement = document.createElement('script');
            scriptElement.textContent = modifiedScript;
            scriptElement.setAttribute('type', 'text/javascript');
            scriptElement.setAttribute('data-source', 'car-tool-loader');
            
            // Find insertion point
            const insertionPoint = document.head || document.documentElement || document.body;
            console.log('📍 Insertion point:', insertionPoint.tagName);
            
            if (insertionPoint) {
                insertionPoint.appendChild(scriptElement);
                console.log('✅ Script injected successfully');
                
                // Clean up after execution
                setTimeout(() => {
                    if (scriptElement.parentNode) {
                        scriptElement.parentNode.removeChild(scriptElement);
                        console.log('🧹 Script element cleaned up');
                    }
                    // Clean up the bridge
                    delete window.GM_bridge;
                }, 5000);
                
                return true;
            } else {
                console.error('❌ No valid insertion point found');
                return false;
            }
        } catch (error) {
            console.error('❌ Script execution error:', error);
            console.error('Error stack:', error.stack);
            return false;
        }
    }
    
    function loadMainScript(attempt = 1) {
        console.log(`🔄 Load attempt ${attempt}/${config.maxRetries}`);
        
        if (!validateEnvironment()) {
            console.warn('❌ Unauthorized domain, stopping');
            return;
        }
        
        const scriptUrl = decodeEndpoint(config.endpoint);
        if (!scriptUrl) {
            console.error('❌ Invalid configuration, stopping');
            return;
        }
        
        const requestUrl = scriptUrl + '?v=' + Date.now() + '&attempt=' + attempt;
        console.log('📡 Requesting:', requestUrl);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: config.timeout,
            onload: function(response) {
                console.log('📡 Response received:', {
                    status: response.status,
                    contentLength: response.responseText.length,
                    headers: response.responseHeaders
                });
                
                if (response.status === 200) {
                    const content = response.responseText;
                    
                    // Enhanced validation
                    const hasFunction = content.includes('function');
                    const hasUserScript = content.includes('UserScript');
                    const hasContent = content.length > 1000;
                    
                    console.log('✅ Content validation:', {
                        hasFunction,
                        hasUserScript,
                        hasContent,
                        length: content.length
                    });
                    
                    if (content && hasContent && hasFunction) {
                        const success = executeScript(content);
                        if (!success && attempt < config.maxRetries) {
                            console.warn(`⚠️ Execution failed, retrying in ${config.retryDelay}ms...`);
                            setTimeout(() => loadMainScript(attempt + 1), config.retryDelay);
                        } else if (success) {
                            console.log('🎉 Script loaded and executed successfully!');
                        }
                    } else {
                        console.error('❌ Invalid content received');
                        if (attempt < config.maxRetries) {
                            setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                        }
                    }
                } else {
                    console.error('❌ HTTP error:', response.status);
                    if (attempt < config.maxRetries) {
                        setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                    }
                }
            },
            onerror: function(error) {
                console.error('❌ Network error:', error);
                if (attempt < config.maxRetries) {
                    setTimeout(() => loadMainScript(attempt + 1), config.retryDelay * attempt);
                }
            },
            ontimeout: function() {
                console.error('⏰ Request timeout');
                if (attempt < config.maxRetries) {
                    setTimeout(() => loadMainScript(attempt + 1), config.retryDelay);
                }
            }
        });
    }
    
    function initialize() {
        console.log('🚀 Initializing CAR Tool...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            console.log('⏳ Waiting for DOM...');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('✅ DOM ready, starting script load');
                setTimeout(loadMainScript, 1000);
            });
        } else {
            console.log('✅ DOM already ready, starting script load');
            setTimeout(loadMainScript, 500);
        }
    }
    
    // Start initialization
    initialize();
    
})();
