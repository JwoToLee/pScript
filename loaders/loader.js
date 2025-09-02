// ==UserScript==
// @name         CAR Batch Extractor Loader
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Secure loader for CAR Batch Extractor
// @author       You
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function(){
    'use strict';
    
    var scriptUrl = 'aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9zY3JpcHRfY29yZS5qcw==';
    
    function decode(encoded) {
        return atob(encoded);
    }
    
    function executeRemoteScript(content) {
        try {
            // Use Function constructor instead of eval
            var scriptFunction = new Function(content);
            scriptFunction.call(window);
        } catch (error) {
            console.error('Script execution failed:', error);
        }
    }
    
    function loadScript() {
        var url = decode(scriptUrl) + '?t=' + Date.now();
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                if (response.status === 200) {
                    executeRemoteScript(response.responseText);
                } else {
                    console.error('Failed to load script, status:', response.status);
                }
            },
            onerror: function() {
                console.error('Network error loading script');
            }
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadScript);
    } else {
        loadScript();
    }
})();
