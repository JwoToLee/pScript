// Quick test to see what a fingerprint would look like
function generateTestFingerprint() {
    const components = [];
    
    // Simulate browser components
    components.push('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    components.push('en-US');
    components.push('Win32');
    components.push('1'); // cookie enabled
    components.push(''); // do not track
    components.push('1920x1080');
    components.push('24'); // color depth
    components.push('24'); // pixel depth
    components.push('America/New_York'); // timezone
    components.push('8'); // hardware concurrency
    components.push('8'); // device memory
    components.push('ANGLE (Intel, Intel(R) UHD Graphics 620'); // WebGL
    components.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7X'); // Canvas
    components.push('44100'); // Audio sample rate
    components.push('1024'); // Audio frequency bins
    
    // Create hash similar to the actual script
    const fingerprint = btoa(components.join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const fullFingerprint = 'fp_' + fingerprint;
    
    console.log('Example fingerprint:', fullFingerprint);
    return fullFingerprint;
}

generateTestFingerprint();
