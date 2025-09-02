// ==UserScript==
// @name         CAR Tool Simple
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Simple direct execution approach
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
    
    console.log('🚀 CAR Tool Simple Loader starting...');
    
    const scriptUrl = 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==';
    
    function decodeUrl(encoded) {
        return atob(encoded);
    }
    
    function loadScript() {
        const url = decodeUrl(scriptUrl) + '?t=' + Date.now();
        console.log('📡 Loading from:', url);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 10000,
            onload: function(response) {
                console.log('📡 Response status:', response.status);
                console.log('📝 Content length:', response.responseText.length);
                
                if (response.status === 200 && response.responseText.length > 1000) {
                    try {
                        console.log('🚀 Executing script directly...');
                        
                        // Execute in the current context to preserve GM functions
                        // eslint-disable-next-line no-eval
                        eval(response.responseText);
                        
                        console.log('✅ Script executed successfully!');
                    } catch (error) {
                        console.error('❌ Execution error:', error);
                        console.error('Error details:', error.stack);
                    }
                } else {
                    console.error('❌ Invalid response:', response.status);
                }
            },
            onerror: function(error) {
                console.error('❌ Network error:', error);
            },
            ontimeout: function() {
                console.error('⏰ Timeout loading script');
            }
        });
    }
    
    // Validate environment
    if (!window.location.hostname.includes('haesl.gaelenlighten.com')) {
        console.warn('❌ Unauthorized domain');
        return;
    }
    
    // Start loading
    setTimeout(loadScript, 1000);
    
})();
