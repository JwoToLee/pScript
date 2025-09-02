# CAR Batch Extractor

A Tampermonkey userscript for extracting CAR (Corrective Action Request) data from web pages with enhanced UI and background processing.

## 📁 Project Structure

```
pScript/
├── README.md                    # This file
├── Script/                     # Legacy script folder
├── config/                     # Configuration files
│   └── access_control.json    # User access control configuration
├── scripts/                    # Core script files
│   ├── script_core.js         # Main application logic
│   ├── script_obfuscated.js   # Obfuscated production version
│   ├── script_secure.js       # Secure version
│   ├── secure_user_script.js  # Secure user script
│   └── user_script.js         # Basic user script
├── loaders/                    # Various loader implementations
│   ├── final_user_script.js   # Main Tampermonkey script (entry point)
│   ├── clean_loader.js        # Clean loader
│   ├── debug_loader.js        # Debug loader
│   ├── loader.js              # Basic loader
│   ├── protected_loader.js    # Protected loader
│   ├── secure_loader.js       # Secure loader
│   └── simple_loader.js       # Simple loader
├── tools/                      # Development and admin tools
│   ├── obfuscate.js           # Script obfuscation tool
│   ├── advanced_obfuscate.js  # Advanced obfuscation
│   └── admin_tool.html        # Administrative interface
├── debug/                      # Debug and testing files
│   ├── debug_access.js        # Access control debugging
│   └── test_fingerprint.js    # Fingerprint testing
└── docs/                       # Documentation
    ├── ADMIN_GUIDE.md         # Administrator guide
    ├── DISTRIBUTION_GUIDE.md  # Distribution guide
    └── README_ACCESS_CONTROL.md # Access control documentation
```

## 🚀 Quick Start

1. **Install Tampermonkey** browser extension
2. **Import the script**: Copy `loaders/final_user_script.js` content into Tampermonkey
3. **Configure access**: Update `config/access_control.json` with user credentials
4. **Navigate to target website** and use the tool

## 🛠️ Development

### Building the Project

To build the obfuscated version:
```bash
cd tools
node obfuscate.js
```

### Project Components

- **final_user_script.js**: Main entry point that loads the obfuscated script
- **scripts/script_core.js**: Core application logic with UI and extraction functionality
- **config/access_control.json**: User authentication and authorization configuration
- **tools/obfuscate.js**: Builds the production-ready obfuscated version

## 🔐 Security

- GitHub-hosted access control with user authentication
- Obfuscated production scripts to protect implementation
- Session management with configurable timeouts
- Account lockout protection against brute force attempts

## 📖 Documentation

See the `docs/` folder for detailed guides:
- **ADMIN_GUIDE.md**: Administrator setup and configuration
- **DISTRIBUTION_GUIDE.md**: How to distribute the script to users
- **README_ACCESS_CONTROL.md**: Access control system documentation

## 🎯 Features

- **Modern UI**: Clean, VS Code-inspired interface with tabbed navigation
- **Hidden Processing**: Background window extraction without user distraction
- **Access Control**: Secure user authentication system
- **Data Export**: CSV export functionality for extracted data
- **Real-time Updates**: Live progress tracking and status updates
- **Context Menu**: Right-click to refresh individual CAR entries

## 📝 Version History

- **v3.1**: Added tabbed navigation and hidden window processing
- **v2.1**: Enhanced UI with modern styling and better UX
- **v2.0**: Access control system and security improvements
- **v1.5**: Initial release with basic extraction functionality

---

For support and questions, contact: **jt-bryce.lee@haesl.com**