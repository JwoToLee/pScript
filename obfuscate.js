const fs = require('fs');

// Read the main script
const script = fs.readFileSync('script_core.js', 'utf8');

// Advanced obfuscation function
function obfuscate(code) {
    // Base64 encode the entire script
    const encoded = Buffer.from(code).toString('base64');
    
    // Split into chunks to avoid detection
    const chunks = [];
    for (let i = 0; i < encoded.length; i += 80) {
        chunks.push(encoded.slice(i, i + 80));
    }
    
    // Create obfuscated loader with variable name mangling
    const obfuscated = `(function(){
var _0x=['${chunks.join("','")}'];
var _1x=function(s){return atob(s);};
var _2x=_0x.join('');
try{
eval(_1x(_2x));
}catch(e){
console.error('Load error:',e.message);
}
})();`;
    
    return obfuscated;
}

const obfuscatedScript = obfuscate(script);
fs.writeFileSync('script_obfuscated.js', obfuscatedScript);
console.log('✅ Script obfuscated successfully');
console.log('📏 Original size:', script.length);
console.log('📏 Obfuscated size:', obfuscatedScript.length);
