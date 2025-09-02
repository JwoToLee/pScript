// ==UserScript==
// @name         CAR Batch Extractor
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Extract CAR data from multiple pages with enhanced UI
// @author       JwoToLee
// @match        https://www.cars.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/JwoToLee/pScript/main/final_user_script.js
// @downloadURL  https://raw.githubusercontent.com/JwoToLee/pScript/main/final_user_script.js
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const SCRIPT_URL = 'https://raw.githubusercontent.com/JwoToLee/pScript/main/script_obfuscated.js';
    const ALLOWED_DOMAINS = ['cars.com', 'www.cars.com'];
    
    // Verify domain
    function isAllowedDomain() {
        const currentDomain = window.location.hostname;
        return ALLOWED_DOMAINS.some(domain => 
            currentDomain === domain || currentDomain.endsWith('.' + domain)
        );
    }
    
    // Load and execute the main script
    function loadMainScript() {
        if (!isAllowedDomain()) {
            console.log('CAR Extractor: Not running on allowed domain');
            return;
        }
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: SCRIPT_URL,
            timeout: 10000,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // Execute the obfuscated script
                        eval(response.responseText);
                        console.log('CAR Extractor: Main script loaded successfully');
                    } catch (error) {
                        console.error('CAR Extractor: Error executing main script:', error);
                    }
                } else {
                    console.error('CAR Extractor: Failed to load main script, status:', response.status);
                }
            },
            onerror: function(error) {
                console.error('CAR Extractor: Network error loading main script:', error);
            },
            ontimeout: function() {
                console.error('CAR Extractor: Timeout loading main script');
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadMainScript);
    } else {
        loadMainScript();
    }
})();
