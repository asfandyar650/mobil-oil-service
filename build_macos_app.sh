#!/usr/bin/env bash
set -e

APP_NAME="Mobil Oil Service"
BUNDLE_DIR="${APP_NAME}.app"

echo "===> Building ${APP_NAME}.app for macOS..."

# 1. Compile native Cocoa / WebKit binary
clang -O2 -framework Cocoa -framework WebKit main.m -o MobilOilService
chmod +x MobilOilService

# 2. Setup App Bundle directories
rm -rf "${BUNDLE_DIR}"
mkdir -p "${BUNDLE_DIR}/Contents/MacOS"
mkdir -p "${BUNDLE_DIR}/Contents/Resources"

# 3. Move binary
cp MobilOilService "${BUNDLE_DIR}/Contents/MacOS/MobilOilService"

# 4. Copy Resources
cp AppIcon.icns "${BUNDLE_DIR}/Contents/Resources/AppIcon.icns"
cp app.py "${BUNDLE_DIR}/Contents/Resources/app.py"
cp index.html "${BUNDLE_DIR}/Contents/Resources/index.html"
cp styles.css "${BUNDLE_DIR}/Contents/Resources/styles.css"
cp app.js "${BUNDLE_DIR}/Contents/Resources/app.js"
cp oil_service.db "${BUNDLE_DIR}/Contents/Resources/oil_service.db"

# 5. Create PkgInfo
echo -n "APPLMOIL" > "${BUNDLE_DIR}/Contents/PkgInfo"

# 6. Create Info.plist
cat << 'EOF' > "${BUNDLE_DIR}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>MobilOilService</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.mobiloil.service</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Mobil Oil Service</string>
    <key>CFBundleDisplayName</key>
    <string>Mobil Oil Service</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

# 7. Ad-hoc codesign
codesign --force --deep --sign - "${BUNDLE_DIR}" || true

echo "===> Successfully created ${BUNDLE_DIR}!"
