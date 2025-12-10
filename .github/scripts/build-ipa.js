const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IOS_DIR = path.join(__dirname, '../ios');
const SOURCES_DIR = path.join(IOS_DIR, 'Sources');
const PROJECT_YML_PATH = path.join(IOS_DIR, 'project.yml');
const CONFIG_SWIFT_PATH = path.join(SOURCES_DIR, 'Config.swift');
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const PACKAGE_JSON_PATH = path.join(FRONTEND_DIR, 'package.json');
const MANIFEST_PATH = path.join(FRONTEND_DIR, 'public/manifest.json');
const OUTPUT_DIR = path.join(process.cwd(), 'ios-build');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Read Configurations
console.log('Reading configurations...');
if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('package.json not found');
    process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const version = pkg.version || '1.0.0';

let pwaUrl = process.env.PWA_URL;
if (!pwaUrl) {
    console.warn('PWA_URL not set, using default from Config.swift or manifest');
    // We strictly need a URL. Fallback:
    pwaUrl = 'https://solumati.fabiseitz.de';
}

console.log(`Building iOS App for: ${pwaUrl} (Version: ${version})`);

// 2. Update Config.swift
console.log('Updating Config.swift...');
const configContent = `import Foundation

struct Config {
    static let pwaUrl = URL(string: "${pwaUrl}/?source=ios")!
}
`;
fs.writeFileSync(CONFIG_SWIFT_PATH, configContent);

// 3. Update project.yml (Version)
console.log('Updating project.yml...');
let projectYml = fs.readFileSync(PROJECT_YML_PATH, 'utf8');
// Replace version
// Assuming lines: CFBundleShortVersionString: "1.0.0" and CFBundleVersion: "1"
projectYml = projectYml.replace(/CFBundleShortVersionString: ".*"/, `CFBundleShortVersionString: "${version}"`);
projectYml = projectYml.replace(/CFBundleVersion: ".*"/, `CFBundleVersion: "${process.env.GITHUB_RUN_NUMBER || '1'}"`);
fs.writeFileSync(PROJECT_YML_PATH, projectYml);

// 4. Generate Icons using sips (macOS only)
console.log('Generating Icons...');
const publicDir = path.join(FRONTEND_DIR, 'public');
// Try to find a high res icon
const iconCandidates = ['icon-512x512.png', 'pwa-512x512.png', 'android-chrome-512x512.png', 'icon.png'];
let sourceIcon = null;
for (const cand of iconCandidates) {
    if (fs.existsSync(path.join(publicDir, cand))) {
        sourceIcon = path.join(publicDir, cand);
        break;
    }
}

if (sourceIcon) {
    const assetsDir = path.join(IOS_DIR, 'Sources', 'Assets.xcassets');
    const appIconDir = path.join(assetsDir, 'AppIcon.appiconset');
    fs.mkdirSync(appIconDir, { recursive: true });

    const contentsJson = {
        "images": [
            { "size": "1024x1024", "idiom": "ios-marketing", "filename": "1024.png", "scale": "1x" },
            { "size": "60x60", "idiom": "iphone", "filename": "180.png", "scale": "3x" },
            { "size": "60x60", "idiom": "iphone", "filename": "120.png", "scale": "2x" },
            { "size": "76x76", "idiom": "ipad", "filename": "152.png", "scale": "2x" },
            { "size": "83.5x83.5", "idiom": "ipad", "filename": "167.png", "scale": "2x" }
        ],
        "info": { "version": 1, "author": "xcode" }
    };

    fs.writeFileSync(path.join(appIconDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2));

    try {
        console.log(`Using source icon: ${sourceIcon}`);
        // Create sizes
        execSync(`sips -z 1024 1024 "${sourceIcon}" --out "${path.join(appIconDir, '1024.png')}"`);
        execSync(`sips -z 180 180 "${sourceIcon}" --out "${path.join(appIconDir, '180.png')}"`);
        execSync(`sips -z 120 120 "${sourceIcon}" --out "${path.join(appIconDir, '120.png')}"`);
        execSync(`sips -z 152 152 "${sourceIcon}" --out "${path.join(appIconDir, '152.png')}"`);
        execSync(`sips -z 167 167 "${sourceIcon}" --out "${path.join(appIconDir, '167.png')}"`);
    } catch (e) {
        console.warn('Failed to resize icons using sips (are you on macOS?):', e.message);
    }
} else {
    console.warn('No source icon found. Proceeding without App Icon.');
}

// 4.1 Password Logic (similar to Android/Windows)
// Even if we don't use it for signing *yet* (unsigned IPA), we prepare the logic as requested.
const KEYCHAIN_PWD_PATH = path.join(process.cwd(), 'ios-keychain.pwd');
let keychainPassword = process.env.IOS_KEYCHAIN_PASSWORD;

if (!keychainPassword) {
    if (fs.existsSync(KEYCHAIN_PWD_PATH)) {
        console.log('Reading keychain password from cached file...');
        keychainPassword = fs.readFileSync(KEYCHAIN_PWD_PATH, 'utf8').trim();
    } else {
        console.log('Generating new default keychain password...');
        // Format: RepoName + 15 random chars
        const repoNameFull = process.env.GITHUB_REPOSITORY || 'Solumati';
        const repoName = repoNameFull.split('/')[1] || repoNameFull;
        const randomSuffix = require('crypto').randomBytes(8).toString('hex').slice(0, 15);
        keychainPassword = `${repoName}${randomSuffix}`;

        // Save for caching
        fs.writeFileSync(KEYCHAIN_PWD_PATH, keychainPassword);
        console.log(`Generated and saved password to ${KEYCHAIN_PWD_PATH} for caching.`);
    }
}
// Note: This password can be used when we enable Code Signing and need to create/unlock a temporary keychain.

// 5. Run XcodeGen
console.log('Running XcodeGen...');
try {
    execSync('xcodegen generate', { cwd: IOS_DIR, stdio: 'inherit' });
} catch (e) {
    console.error('XcodeGen failed. Ensure xcodegen is installed.');
    process.exit(1);
}

// 6. Build App
console.log('Building App (xcodebuild)...');
const buildDir = path.join(IOS_DIR, 'build');
try {
    // Build generic iOS device
    execSync(`xcodebuild build -scheme Solumati -destination "generic/platform=iOS" -configuration Release -derivedDataPath "${buildDir}" CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO`, {
        cwd: IOS_DIR,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
}

// 7. Package IPA
console.log('Packaging IPA...');
const productsDir = path.join(buildDir, 'Build', 'Products', 'Release-iphoneos');
const appPath = path.join(productsDir, 'Solumati.app');

if (!fs.existsSync(appPath)) {
    console.error(`App not found at ${appPath}`);
    process.exit(1);
}

const payloadDir = path.join(OUTPUT_DIR, 'Payload');
if (fs.existsSync(payloadDir)) fs.rmSync(payloadDir, { recursive: true, force: true });
fs.mkdirSync(payloadDir, { recursive: true });

// Move .app to Payload
execSync(`cp -R "${appPath}" "${payloadDir}/"`);

// Zip
const ipaName = `solumati-${version}.ipa`;
const ipaPath = path.join(OUTPUT_DIR, ipaName);

// Need to zip the Payload directory
console.log(`Zipping to ${ipaPath}...`);
execSync(`zip -r "${ipaPath}" Payload`, { cwd: OUTPUT_DIR });

console.log(`IPA generated successfully: ${ipaPath}`);
