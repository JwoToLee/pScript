// Debug script to check access control issues
// Run this in browser console to debug fingerprint and access issues

console.log('=== ACCESS CONTROL DEBUG ===');

// Check if Tampermonkey storage has cached fingerprint
if (typeof GM_getValue !== 'undefined') {
    const cachedFingerprint = GM_getValue('userFingerprint', null);
    console.log('Cached fingerprint from Tampermonkey:', cachedFingerprint);
    
    // Clear cached fingerprint for fresh generation
    if (cachedFingerprint) {
        console.log('Clearing cached fingerprint...');
        GM_setValue('userFingerprint', null);
    }
} else {
    console.log('GM_getValue not available - not running in Tampermonkey context');
}

// Generate fresh fingerprint using the same logic as the script
function debugGenerateFingerprint() {
    const components = [];
    
    try {
        // Browser and system info
        components.push(navigator.userAgent || '');
        components.push(navigator.language || '');
        components.push(navigator.platform || '');
        components.push(navigator.cookieEnabled ? '1' : '0');
        components.push(navigator.doNotTrack || '');
        
        // Screen info
        components.push(screen.width + 'x' + screen.height);
        components.push(screen.colorDepth || '');
        components.push(screen.pixelDepth || '');
        
        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        
        // Hardware info
        components.push(navigator.hardwareConcurrency || '');
        components.push(navigator.deviceMemory || '');
        
        // WebGL fingerprint
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const renderer = gl.getParameter(gl.RENDERER) || '';
            const vendor = gl.getParameter(gl.VENDOR) || '';
            components.push(renderer + vendor);
        }
        
        // Canvas fingerprint
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('CAR Extractor Fingerprint', 2, 2);
        components.push(canvas.toDataURL());
        
        // Audio context fingerprint
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const analyser = audioCtx.createAnalyser();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(analyser);
            analyser.connect(gainNode);
            
            components.push(audioCtx.sampleRate.toString());
            components.push(analyser.frequencyBinCount.toString());
            
            audioCtx.close();
        } catch (e) {
            components.push('audio_unavailable');
        }
        
    } catch (error) {
        console.warn('Error generating fingerprint component:', error);
    }
    
    // Create hash of all components
    const fingerprint = btoa(components.join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const fullFingerprint = 'fp_' + fingerprint;
    
    console.log('🔍 Fresh fingerprint generated:', fullFingerprint);
    console.log('📋 Individual components:');
    components.forEach((comp, i) => {
        const compStr = String(comp || ''); // Convert to string safely
        console.log(`  ${i}: ${compStr.substring(0, 100)}${compStr.length > 100 ? '...' : ''}`);
    });
    
    return fullFingerprint;
}

const freshFingerprint = debugGenerateFingerprint();

// Check access control
fetch('https://raw.githubusercontent.com/JwoToLee/pScript/main/access_control.json?t=' + Date.now())
    .then(response => {
        console.log('Access control fetch status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Access control data:', data);
        console.log('Allowed fingerprints:', data.accessControl.allowedFingerprints);
        console.log('Your fingerprint:', freshFingerprint);
        console.log('Is your fingerprint in allowed list?', data.accessControl.allowedFingerprints.includes(freshFingerprint));
        
        if (!data.accessControl.allowedFingerprints.includes(freshFingerprint)) {
            console.log('❌ Your fingerprint is NOT in the allowed list');
            console.log('💡 Add this fingerprint to access_control.json:');
            console.log(`"${freshFingerprint}"`);
        } else {
            console.log('✅ Your fingerprint IS in the allowed list');
            console.log('🤔 Issue might be elsewhere - check for other errors');
        }
    })
    .catch(error => {
        console.error('❌ Failed to fetch access control:', error);
        console.log('This might be the issue - CORS or network problems');
    });

console.log('=== DEBUG COMPLETE ===');
