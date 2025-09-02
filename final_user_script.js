// ==UserScript==
// @name         CAR Enterprise Tool
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Enterprise CAR reporting tool - Authorized access required
// @author       IT Department
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      Proprietary - Confidential
// @run-at       document-end
// ==/UserScript==

/*
 * ⚠️ CONFIDENTIAL AND PROPRIETARY SOFTWARE ⚠️
 * 
 * This software contains trade secrets and confidential information.
 * Unauthorized access, use, copying, or distribution is strictly prohibited.
 * Violators will be prosecuted to the full extent of the law.
 * 
 * Licensed for authorized enterprise users only.
 * Copyright © 2025 - All Rights Reserved
 */

(function() {
    'use strict';
    
    // Security configuration
    const config = {
        domain: 'haesl.gaelenlighten.com',
        script: 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfb2JmdXNjYXRlZC5qcw==',
        timeout: 20000,
        retries: 2
    };
    
    function validateEnvironment() {
        const hostname = window.location.hostname;
        const isValid = hostname.includes(config.domain);
        
        if (!isValid) {
            console.error('🚫 Unauthorized domain:', hostname);
            showSecurityAlert('Domain validation failed. This tool is not authorized for this domain.');
        }
        
        return isValid;
    }
    
    function showSecurityAlert(message) {
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.9); z-index: 999999; display: flex; 
                        align-items: center; justify-content: center; font-family: monospace;">
                <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); 
                           color: white; padding: 40px; border-radius: 10px; 
                           text-align: center; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h2 style="margin: 0 0 20px 0;">🔒 SECURITY ALERT</h2>
                    <p style="margin: 0 0 20px 0; font-size: 16px;">${message}</p>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                        Contact your system administrator for assistance.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(alertDiv);
    }
    
    function decodeEndpoint() {
        try {
            return atob(config.script);
        } catch (e) {
            console.error('🔧 Configuration decode failed');
            return null;
        }
    }
    
    function executeScript(content, attempt = 1) {
        try {
            // Validate content before execution
            if (!content || content.length < 1000) {
                throw new Error('Invalid or corrupted content');
            }
            
            // Execute the obfuscated script in Tampermonkey context
            // This preserves GM_ functions while hiding source code
            eval(content);
            
            console.log('✅ Enterprise tool loaded successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Execution failed:', error.message);
            
            if (attempt < config.retries) {
                console.log(`🔄 Retrying... (${attempt + 1}/${config.retries})`);
                setTimeout(() => loadMainScript(attempt + 1), 2000);
            } else {
                showSecurityAlert('Failed to load tool. Please contact support.');
            }
            
            return false;
        }
    }
    
    function loadMainScript(attempt = 1) {
        if (!validateEnvironment()) {
            return;
        }
        
        const url = decodeEndpoint();
        if (!url) {
            showSecurityAlert('Configuration error. Please contact support.');
            return;
        }
        
        const requestUrl = url + '?v=' + Date.now() + '&auth=' + btoa(navigator.userAgent).slice(-12);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: requestUrl,
            timeout: config.timeout,
            onload: function(response) {
                if (response.status === 200) {
                    executeScript(response.responseText, attempt);
                } else {
                    console.error('❌ HTTP error:', response.status);
                    if (attempt < config.retries) {
                        setTimeout(() => loadMainScript(attempt + 1), 3000);
                    } else {
                        showSecurityAlert('Service unavailable. Please try again later.');
                    }
                }
            },
            onerror: function() {
                console.error('❌ Network error');
                if (attempt < config.retries) {
                    setTimeout(() => loadMainScript(attempt + 1), 5000);
                } else {
                    showSecurityAlert('Connection failed. Check your network and try again.');
                }
            },
            ontimeout: function() {
                console.error('⏰ Request timeout');
                if (attempt < config.retries) {
                    setTimeout(() => loadMainScript(attempt + 1), 2000);
                } else {
                    showSecurityAlert('Request timeout. Please try again.');
                }
            }
        });
    }
    
    // Initialize when DOM is ready
    function initialize() {
        console.log('🚀 Enterprise CAR Tool initializing...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(loadMainScript, 1000);
            });
        } else {
            setTimeout(loadMainScript, 500);
        }
    }
    
    // Start the application
    initialize();
    
})();
