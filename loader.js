// ==UserScript==
// @name         CAR Batch Extractor Loader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Secure loader for CAR Batch Extractor
// @author       You
// @match        https://haesl.gaelenlighten.com/Reporting/ReportingManagement*
// @match        https://haesl.gaelenlighten.com/Reporting/Report/Index/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function(){var a=['aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0p3b1RvTGVlL3BTY3JpcHQvbWFpbi9TY3JpcHQ='];function b(c){return atob(c)}function d(){var e=b(a[0]);GM_xmlhttpRequest({method:'GET',url:e+'?t='+Date.now(),onload:function(f){if(f.status===200){try{eval(f.responseText)}catch(g){console.error('Script execution failed:',g)}}else{console.error('Failed to load script, status:',f.status)}},onerror:function(){console.error('Network error loading script')}})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',d)}else{d()}})();
