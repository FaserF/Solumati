const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WINDOWS_DIR = path.join(__dirname, '../windows');
const PROJECT_DIR = path.join(WINDOWS_DIR, 'Solumati');
const ASSETS_DIR = path.join(PROJECT_DIR, 'Assets');
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const PACKAGE_JSON_PATH = path.join(FRONTEND_DIR, 'package.json');
const CONFIG_CS_PATH = path.join(PROJECT_DIR, 'Config.cs');
const MANIFEST_PATH = path.join(PROJECT_DIR, 'Package.appxmanifest');
const CERT_PWD_PATH = path.join(process.cwd(), 'windows-certificate.pwd');

// Ensure assets dir
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 1. Password Logic (similar to Android)
let certPassword = process.env.WINDOWS_CERT_PASSWORD;
if (!certPassword) {
    if (fs.existsSync(CERT_PWD_PATH)) {
        console.log('Reading certificate password from cached file...');
        certPassword = fs.readFileSync(CERT_PWD_PATH, 'utf8').trim();
    } else {
        console.log('Generating new default certificate password...');
        // Format: RepoName + 15 random chars
        const repoNameFull = process.env.GITHUB_REPOSITORY || 'Solumati';
        const repoName = repoNameFull.split('/')[1] || repoNameFull;
        const randomSuffix = require('crypto').randomBytes(8).toString('hex').slice(0, 15);
        certPassword = `${repoName}${randomSuffix}`;

        // Save for caching
        fs.writeFileSync(CERT_PWD_PATH, certPassword);
        console.log(`Generated and saved password to ${CERT_PWD_PATH} for caching.`);
    }
}

// 1. Read Config
if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('package.json not found');
    process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
// UWP Version must be quad, e.g. 1.0.0.0
// pkg.version might be 2025.12.1-b6 or similar.
// We need to parse strict 4 integers.
// If it fails, fallback to 1.0.0.0
let version = '1.0.0.0';
const versionParts = pkg.version ? pkg.version.replace(/[^0-9.]/g, '.').split('.').filter(p => p !== '') : [];
if (versionParts.length >= 3) {
    version = `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.${process.env.GITHUB_RUN_NUMBER || 0}`;
} else {
    version = `1.0.0.${process.env.GITHUB_RUN_NUMBER || 0}`;
}
console.log(`Detected Version for UWP: ${version}`);

let pwaUrl = process.env.PWA_URL;
if (!pwaUrl) pwaUrl = 'https://solumati.fabiseitz.de';

// 2. Update Config.cs
const configContent = `using System;

namespace Solumati
{
    public static class Config
    {
        public static readonly Uri PwaUrl = new Uri("${pwaUrl}/?source=windows");
    }
}
`;
fs.writeFileSync(CONFIG_CS_PATH, configContent);
console.log('Updated Config.cs');

// 3. Update Package.appxmanifest
let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
manifest = manifest.replace(/Version="[^"]*"/, `Version="${version}"`);
// Update Publisher if needed? Keeping generic "CN=Solumati" for now.
fs.writeFileSync(MANIFEST_PATH, manifest);
console.log('Updated Package.appxmanifest');

// 4. Generate/Copy Icons
const publicDir = path.join(FRONTEND_DIR, 'public');
const iconCandidates = ['icon-512x512.png', 'pwa-512x512.png', 'android-chrome-512x512.png', 'icon.png'];
let sourceIcon = null;
for (const cand of iconCandidates) {
    if (fs.existsSync(path.join(publicDir, cand))) {
        sourceIcon = path.join(publicDir, cand);
        break;
    }
}

if (sourceIcon) {
    console.log(`Using source icon: ${sourceIcon}`);

    // We need to resize this using PowerShell since we don't have sharp/jimp installed
    const resizeImage = (src, dest, width, height) => {
        const psCommand = `
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile('${src}')
$thumb = $image.GetThumbnailImage(${width}, ${height}, $null, [IntPtr]::Zero)
$thumb.Save('${dest}')
$image.Dispose()
$thumb.Dispose()
        `;
        // Remove newlines to avoid exec issues or use a temp file?
        // Using -Command allows multiline usually.
        try {
            execSync(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to resize to ${width}x${height}:`, e.message);
            // Fallback: Copy original
            fs.copyFileSync(src, dest);
        }
    };

    // Target sizes based on manifest
    const mappings = [
        { name: 'StoreLogo.png', w: 50, h: 50 },
        { name: 'Square150x150Logo.png', w: 150, h: 150 },
        { name: 'Square44x44Logo.png', w: 44, h: 44 },
        { name: 'Wide310x150Logo.png', w: 310, h: 150 },
        { name: 'SplashScreen.png', w: 620, h: 300 }, // Approximate splash
    ];

    mappings.forEach(m => {
        resizeImage(sourceIcon, path.join(ASSETS_DIR, m.name), m.w, m.h);
    });
} else {
    console.warn('No icon found. Build might fail if Assets missing.');
}

// 5. Generate Certificate if missing
const pfxPath = path.join(PROJECT_DIR, 'Solumati_TemporaryKey.pfx');
// We always try to use the password for signing. If cert is missing, we create it with that password.
if (!fs.existsSync(pfxPath)) {
    console.log('Generating Self-Signed Certificate...');
    // New-SelfSignedCertificate returns the Cert object. We need to export it.
    const psCert = `
$cert = New-SelfSignedCertificate -CertStoreLocation Cert:\\CurrentUser\\My -Type CodeSigningCert -Subject "CN=Solumati"
$pwd = ConvertTo-SecureString -String "${certPassword}" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "${pfxPath}" -Password $pwd
    `;
    try {
        execSync(`powershell -Command "${psCert.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to generate cert:', e.message);
    }
}

// 6. Build
console.log('Building with MSBuild...');
// We rely on MSBuild being in PATH (Developer Command Prompt) or setup-msbuild action
try {
    // Restore
    execSync(`msbuild -t:Restore -p:RestorePackagesConfig=true`, { cwd: PROJECT_DIR, stdio: 'inherit' });

    // Build and Package
    // /p:AppxBundle=Always /p:AppxPackageSigningEnabled=true /p:PackageCertificateKeyFile="Solumati_TemporaryKey.pfx" /p:PackageCertificatePassword="password"
    const args = [
        '/p:Configuration=Release',
        '/p:AppxBundle=Always',
        '/p:AppxBundlePlatforms="x86|x64"',
        '/p:AppxPackageDir=..\\AppPackages',
        '/p:AppxPackageSigningEnabled=true',
        `/p:PackageCertificateKeyFile="${pfxPath}"`,
        `/p:PackageCertificatePassword="${certPassword}"`
    ];

    execSync(`msbuild ${args.join(' ')}`, { cwd: PROJECT_DIR, stdio: 'inherit' });
    console.log('Build Success!');
} catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
}
