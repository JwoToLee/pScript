# Access Control Configuration

This file controls access to the CAR Batch Extractor Tampermonkey script using user fingerprinting.

## Configuration Options

### Global Settings
- `globalEnabled`: Master switch to enable/disable the script for all users
- `version`: Configuration version for tracking changes
- `lastUpdated`: Timestamp of last configuration update

### Access Control
- `enabled`: Enable/disable access control (if false, script runs for everyone)
- `mode`: Either "whitelist" (only allowed users) or "blacklist" (everyone except blocked users)
- `allowedUsers`: Array of user fingerprints allowed to use the script
- `blockedUsers`: Array of user fingerprints blocked from using the script

### Features
Control which features are available:
- `extraction`: Allow CAR data extraction
- `export`: Allow CSV export functionality
- `debug`: Allow debug mode

### Messages
- `unauthorized`: Message shown to unauthorized users
- `disabled`: Message shown when script is globally disabled

## How to Get User Fingerprints

1. When a user runs the script for the first time, their fingerprint will be automatically generated
2. The fingerprint will be displayed in two ways:
   - **Console Log**: Press F12 to open developer tools, look for "🔍 CAR Extractor - User Fingerprint Details"
   - **Screen Notification**: A purple notification will appear in the top-right corner
3. Copy the fingerprint (format: `fp_xxxxxxxxxxxxxxxxx`) from either location

## How to Update Access

1. Get the user's fingerprint (see above)
2. Edit the `access_control.json` file in this repository
3. Add the fingerprint to the `allowedUsers` array:
   ```json
   "allowedUsers": [
     "fp_abc123def456ghi789",
     "fp_xyz987uvw654rst321"
   ]
   ```
4. Commit and push changes
5. Changes will take effect within 5 minutes for all users

## User Identification

The script generates a unique fingerprint based on:
- Browser user agent and language
- Screen resolution and color depth
- Timezone and platform information
- Hardware capabilities (CPU cores, memory)
- WebGL renderer information
- Canvas rendering characteristics
- Audio context properties

This fingerprint is stable across browser sessions but may change if:
- The user updates their browser
- The user changes their display settings
- The user switches devices

## Emergency Disable

To quickly disable the script for all users:
```json
{
  "globalEnabled": false
}
```

## Example Configuration

```json
{
  "version": "1.0",
  "lastUpdated": "2025-09-02T00:00:00Z",
  "globalEnabled": true,
  "accessControl": {
    "enabled": true,
    "mode": "whitelist",
    "allowedUsers": [
      "fp_abc123def456ghi789jkl012",
      "fp_mno345pqr678stu901vwx234"
    ],
    "blockedUsers": []
  },
  "features": {
    "extraction": true,
    "export": true,
    "debug": true
  },
  "message": {
    "unauthorized": "Access denied. Please contact your administrator to request access to this tool.",
    "disabled": "This tool is currently disabled for maintenance. Please try again later."
  }
}
```
