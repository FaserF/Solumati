const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');

// Import Bubblewrap Core
let TwaGenerator, TwaManifest, ConsoleLog;
try {
    const bubblewrap = require('@bubblewrap/core');
    TwaGenerator = bubblewrap.TwaGenerator;
    TwaManifest = bubblewrap.TwaManifest;
    ConsoleLog = bubblewrap.ConsoleLog;
} catch (e) {
    console.error('Failed to load @bubblewrap/core. Ensure it is installed.', e);
    process.exit(1);
}

// Configuration
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public');
const PWA_MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');
const PACKAGE_JSON_PATH = path.join(FRONTEND_DIR, 'package.json');
const ANDROID_OUTPUT_DIR = path.join(process.cwd(), 'android');
const KEYSTORE_PATH = path.join(process.cwd(), 'android-keystore.jks');
const KEYSTORE_PWD_PATH = path.join(process.cwd(), 'keystore.pwd');

// Clean up previous build
if (fs.existsSync(ANDROID_OUTPUT_DIR)) {
    console.log('Cleaning existing android output directory...');
    fs.rmSync(ANDROID_OUTPUT_DIR, { recursive: true, force: true });
}

// Validate Environment
const pwaUrl = process.env.PWA_URL;
if (!pwaUrl) {
    console.error('Error: PWA_URL environment variable is required');
    process.exit(1);
}

const baseUrl = pwaUrl.replace(/\/$/, '');
const host = new URL(baseUrl).hostname;

// Signing Configuration
const keystoreBase64 = process.env.ANDROID_KEYSTORE_BASE64;
let storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
let keyAlias = process.env.ANDROID_KEY_ALIAS || 'android';
let keyPassword = process.env.ANDROID_KEY_PASSWORD;

// Default Password Logic
// If passwords are not in env, check if we have a cached password file or generate one
if (!storePassword) {
    if (fs.existsSync(KEYSTORE_PWD_PATH)) {
        console.log('Reading keystore password from cached file...');
        storePassword = fs.readFileSync(KEYSTORE_PWD_PATH, 'utf8').trim();
    } else {
        console.log('Generating new default keystore password...');
        // Format: RepoName + 15 random chars
        const repoNameFull = process.env.GITHUB_REPOSITORY || 'Solumati';
        const repoName = repoNameFull.split('/')[1] || repoNameFull; // Get 'Solumati' from 'FaserF/Solumati'
        const randomSuffix = require('crypto').randomBytes(8).toString('hex').slice(0, 15);
        storePassword = `${repoName}${randomSuffix}`;

        // Save for caching
        fs.writeFileSync(KEYSTORE_PWD_PATH, storePassword);
        console.log(`Generated and saved password to ${KEYSTORE_PWD_PATH} for caching.`);
    }
}

// Fallback for key password if not set (same as store password)
if (!keyPassword) {
    keyPassword = storePassword;
}

// Read Source Files
console.log('Reading frontend/manifest.json...');
if (!fs.existsSync(PWA_MANIFEST_PATH)) {
    console.error(`Error: Manifest not found at ${PWA_MANIFEST_PATH} `);
    process.exit(1);
}
const pwaManifest = JSON.parse(fs.readFileSync(PWA_MANIFEST_PATH, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

// Determine Version Code
const versionCode = parseInt(process.env.GITHUB_RUN_NUMBER) || 1;

// Start Local Server to serve assets (Icon, Manifest) locally
// This avoids fetching from the live site which might result in 502s or consistency issues.
const server = http.createServer((req, res) => {
    // We serve files primarily from public dir
    // But manifest.json is in frontend root in this repo structure?
    // Let's check where the request is pointing.

    let filePath;
    if (req.url === '/manifest.json') {
        filePath = PWA_MANIFEST_PATH;
    } else {
        // All other assets (icons) should be in public
        filePath = path.join(PUBLIC_DIR, req.url);
    }

    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.json') contentType = 'application/json';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.jpg') contentType = 'image/jpeg';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        console.warn(`[LocalServer] 404 Not Found: ${req.url} (Mapped to: ${filePath})`);
        res.writeHead(404);
        res.end('Not found');
    }
});

function build() {
    server.listen(0, async () => { // Listen on random port
        const port = server.address().port;
        const localBaseUrl = `http://localhost:${port}`;
        console.log(`Local asset server started on port ${port}`);

        try {
            // Helper to resolve icon URL to LOCAL server
            const resolveLocalIcon = (size) => {
                const icon = pwaManifest.icons.find(i => i.sizes === size);
                if (!icon) return null;
                // If icon.src is absolute (http...), we might have a problem if it's external.
                // Assuming relative paths as per typical manifest.
                let src = icon.src;
                if (src.startsWith('http')) {
                    console.warn(`Warning: Icon src is absolute (${src}). Using as is, but might fail if external.`);
                    return src;
                }
                // Determine path relative to server root (which maps to PUBLIC_DIR)
                // If src starts with /, it's fine. If not, we assume it's relative to root.
                return src.startsWith('/') ? `${localBaseUrl}${src}` : `${localBaseUrl}/${src}`;
            };

            const icon512Local = resolveLocalIcon('512x512');
            if (!icon512Local) {
                throw new Error('Could not find 512x512 icon in manifest');
            }

            // Prepare TWA Manifest
            // We use the REAL host/startUrl for the app configuration
            // But we use LOCAL URLs for build-time asset fetching (icons, webManifestUrl)
            const twaManifestConfig = {
                packageId: `com.solumati.twa`,
                host: host,
                name: pwaManifest.name || 'Solumati',
                launcherName: pwaManifest.short_name || pwaManifest.name || 'Solumati',
                display: pwaManifest.display || 'standalone',
                themeColor: pwaManifest.theme_color || '#000000',
                themeColorDark: pwaManifest.theme_color || '#000000',
                navigationColor: pwaManifest.theme_color || '#000000',
                navigationColorDark: pwaManifest.theme_color || '#000000',
                navigationDividerColor: pwaManifest.theme_color || '#000000',
                navigationDividerColorDark: pwaManifest.theme_color || '#000000',
                backgroundColor: pwaManifest.background_color || '#ffffff',
                enableNotifications: true,
                startUrl: '/',
                iconUrl: icon512Local, // Use local server URL
                maskableIconUrl: icon512Local, // Use local server URL
                splashScreenFadeOutDuration: 300,
                signingKey: {
                    path: KEYSTORE_PATH,
                    alias: keyAlias,
                },
                appVersion: pkgJson.version,
                appVersionCode: versionCode,
                shortcuts: [],
                generatorApp: 'bubblewrap-script',
                webManifestUrl: `${localBaseUrl}/manifest.json`, // Use local server URL
                fallbackType: 'customtabs',
                features: {
                    locationDelegation: { enabled: false },
                    playBilling: { enabled: false }
                },
                alphaDependencies: { enabled: false },
                enableSiteSettingsShortcut: true,
                isChromeOSOnly: false,
                isMetaQuest: false,
                fullScopeUrl: baseUrl
            };

            // Generate Keystore if missing
            // Handle Keystore
            if (keystoreBase64) {
                console.log('Decoding keystore from secret...');
                fs.writeFileSync(KEYSTORE_PATH, Buffer.from(keystoreBase64, 'base64'));
            } else if (!fs.existsSync(KEYSTORE_PATH)) {
                console.log('Generating temporary keystore for signing...');
                execSync(
                    `keytool -genkeypair -dname "cn=Solumati, ou=Tech, o=Solumati, c=DE" -alias "${keyAlias}" -keypass "${keyPassword}" -keystore ${KEYSTORE_PATH} -storepass "${storePassword}" -keyalg RSA -keysize 2048 -validity 10000`,
                    { stdio: 'inherit' }
                );
            }

            console.log('Initializing TWA Manifest...');
            const manifest = new TwaManifest(twaManifestConfig);

            console.log('Generating Android Project...');
            const log = new ConsoleLog('BuildAPK');
            const generator = new TwaGenerator();

            await generator.createTwaProject(ANDROID_OUTPUT_DIR, manifest, log);
            console.log('Android Project Generated successfully.');

            // Inject Signing Config into build.gradle
            const buildGradlePath = path.join(ANDROID_OUTPUT_DIR, 'app', 'build.gradle');
            if (fs.existsSync(buildGradlePath)) {
                console.log('Injecting signing configuration into build.gradle...');
                let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

                // 1. Add signingConfigs block to android {}
                const signingConfigBlock = `
    signingConfigs {
        release {
            storeFile file(project.findProperty("storeFile"))
            storePassword project.findProperty("storePassword")
            keyAlias project.findProperty("keyAlias")
            keyPassword project.findProperty("keyPassword")
        }
    }`;
                // Insert after "android {"
                buildGradle = buildGradle.replace('android {', 'android {' + signingConfigBlock);

                // 2. Apply signingConfig to release build type
                // We look for 'buildTypes {' then 'release {' inside it.
                // A safe heuristic is to replace 'release {' with 'release { signingConfig signingConfigs.release'
                // verifying we are inside buildTypes is harder with simple replace, but 'release {' is standard.
                // However, to be safer vs debug builds, we can try to find the release block specifically.
                // Most bubblewrap templates look like:
                // buildTypes {
                //     release {
                //         minifyEnabled true
                //         ...
                //     }
                // }
                // We'll just replace "release {" with "release {\n            signingConfig signingConfigs.release"
                buildGradle = buildGradle.replace('release {', 'release {\n            signingConfig signingConfigs.release');

                fs.writeFileSync(buildGradlePath, buildGradle);
                console.log('build.gradle updated with signing config.');
            } else {
                console.warn('Warning: Could not find android/app/build.gradle to inject signing config.');
            }

            console.log('Building APK with Gradle...');
            const env = { ...process.env };

            // Normalize path for Gradle (force forward slashes even on Windows) to avoid escape issues
            const keystorePathForGradle = KEYSTORE_PATH.replace(/\\/g, '/');

            // Pass keystore info to Gradle
            const gradleArgs = [
                'assembleRelease',
                `-PstoreFile=${keystorePathForGradle}`,
                `-PstorePassword=${storePassword}`,
                `-PkeyAlias=${keyAlias}`,
                `-PkeyPassword=${keyPassword}`
            ];

            const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
            const gradlewPath = path.join(ANDROID_OUTPUT_DIR, gradlew);

            if (process.platform !== 'win32') {
                fs.chmodSync(gradlewPath, '755');
            }

            execSync(`${gradlewPath} ${gradleArgs.join(' ')}`, {
                cwd: ANDROID_OUTPUT_DIR,
                stdio: 'inherit',
                env: env
            });

            console.log('APK Build completed successfully!');

        } catch (e) {
            console.error('Build failed:', e);
            process.exit(1);
        } finally {
            console.log('Stopping local asset server...');
            server.close(() => {
                process.exit(0);
            });
            // Force exit if close takes too long
            setTimeout(() => {
                process.exit(0);
            }, 1000).unref();
        }
    });
}

build();
