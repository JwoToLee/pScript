# CAR Extractor Admin Guide

## Quick Setup

### 1. Initial Setup
1. Commit and push all files to your GitHub repository
2. Share the Tampermonkey script with users
3. Users will see their fingerprint when they first run the script

### 2. Managing User Access

#### When a user requests access:

1. **User runs the script** → Gets access denied message
2. **User opens console (F12)** → Sees their fingerprint logged
3. **User copies fingerprint** → Sends it to you (format: `fp_xxxxxxxxxxxxxxxxx`)
4. **You add the fingerprint** to `access_control.json`
5. **User tries again** → Gets access within 5 minutes

#### Adding a user manually to access_control.json:

```json
{
  "accessControl": {
    "allowedFingerprints": [
      "fp_abc123def456ghi789jkl012",
      "fp_new_user_fingerprint_here"
    ]
  }
}
```

#### Using the Admin Tool:

1. Open `admin_tool.html` in your browser
2. Click "Load Current Config"
3. Add new fingerprints in the text field
4. Generate and copy the new configuration
5. Update `access_control.json` in GitHub

### 3. Emergency Actions

#### Disable script for everyone:
```json
{
  "globalEnabled": false
}
```

#### Disable access control (allow everyone):
```json
{
  "accessControl": {
    "enabled": false
  }
}
```

#### Block a specific user:
```json
{
  "accessControl": {
    "mode": "whitelist",
    "allowedFingerprints": ["fp_user1", "fp_user2"],
    "blockedFingerprints": ["fp_blocked_user"]
  }
}
```

### 4. User Instructions

Send this to new users:

---

**To use the CAR Batch Extractor:**

1. Install the Tampermonkey script
2. Navigate to the CAR reporting page
3. If you get "Access Denied":
   - Press F12 to open developer tools
   - Look for the fingerprint in the console (starts with `fp_`)
   - Copy the fingerprint and send it to the admin
   - Wait for admin to add you to the access list (up to 5 minutes)

**Your fingerprint is unique to your browser and device.**

---

### 5. Monitoring

- Users' fingerprints are logged to browser console
- Access checks happen every 5 minutes
- Configuration is fetched from GitHub raw URL
- Changes to `access_control.json` take effect within 5 minutes

### 6. Troubleshooting

**User can't see their fingerprint:**
- Make sure they open developer tools (F12)
- Look for the grouped log "🔍 CAR Extractor - User Fingerprint Details"
- They should also see a purple notification on screen

**Access not working after adding fingerprint:**
- Wait up to 5 minutes for changes to propagate
- Check that the fingerprint was copied correctly
- Verify `access_control.json` syntax is valid

**User's fingerprint changed:**
- This can happen after browser updates or system changes
- Get their new fingerprint and update the access list
- Consider using "blacklist" mode if this happens frequently

### 7. File Structure

```
/workspaces/pScript/
├── Script                    # Main Tampermonkey script
├── access_control.json       # Access control configuration
├── admin_tool.html          # Web-based admin interface
└── README_ACCESS_CONTROL.md # Documentation
```
