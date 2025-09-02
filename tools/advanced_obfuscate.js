const fs = require('fs');

// Read the main script
const script = fs.readFileSync('script_core.js', 'utf8');

// Advanced multi-layer obfuscation
function advancedObfuscate(code) {
    // Layer 1: String encoding with key rotation
    function encodeWithKey(str, key) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            result += String.fromCharCode(char ^ keyChar);
        }
        return Buffer.from(result, 'binary').toString('base64');
    }
    
    // Layer 2: Split and scramble
    const key = 'enterprise_sec_2025';
    const encoded = encodeWithKey(code, key);
    
    // Split into random chunks
    const chunks = [];
    const chunkSize = 50;
    for (let i = 0; i < encoded.length; i += chunkSize) {
        chunks.push(encoded.slice(i, i + chunkSize));
    }
    
    // Scramble chunk order
    const scrambledChunks = chunks.map((chunk, index) => ({ chunk, index }));
    scrambledChunks.sort(() => Math.random() - 0.5);
    
    // Create decode function
    const obfuscated = `(function(){
var _k='${key}';
var _c=[${scrambledChunks.map(item => `{d:'${item.chunk}',i:${item.index}}`).join(',')}];
var _d=function(s,k){var r='';for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);var kc=k.charCodeAt(i%k.length);r+=String.fromCharCode(c^kc);}return r;};
var _s=_c.sort(function(a,b){return a.i-b.i;}).map(function(x){return x.d;}).join('');
try{
var _t=_d(atob(_s),_k);
eval(_t);
}catch(e){
console.error('Process error:',e.message);
}
})();`;
    
    return obfuscated;
}

const advancedObfuscated = advancedObfuscate(script);
fs.writeFileSync('script_secure.js', advancedObfuscated);
console.log('✅ Advanced obfuscation complete');
console.log('📏 Original size:', script.length);
console.log('📏 Secure size:', advancedObfuscated.length);

// Also create a simple obfuscated version for GitHub
const simpleObfuscated = `(function(){var _0x='${Buffer.from(script).toString('base64')}';try{eval(atob(_0x));}catch(e){console.error('Load error:',e.message);}})();`;
fs.writeFileSync('script_obfuscated.js', simpleObfuscated);
console.log('✅ Simple obfuscation complete');
console.log('📏 Simple size:', simpleObfuscated.length);
