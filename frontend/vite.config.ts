// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'
import path from 'path'; // Importiere 'path'

// Get VITE_SERVER_DOMAIN environment variable, which should contain the
// full host (e.g. "meinedomain.de") defined in the Admin Console.
const serverDomain = process.env.VITE_SERVER_DOMAIN;

// Helper function to extract the hostname only (without protocol/port)
const extractHostname = (url) => {
    try {
        if (!url) return null;

        // Add dummy protocol if missing to enable URL parsing
        if (!url.startsWith('http')) {
            url = 'http://' + url;
        }

        const parsedUrl = new URL(url);
        // Only return the hostname (e.g., 'meinedomain.de')
        return parsedUrl.hostname;
    } catch (e) {
        console.warn(`[Vite Config] Could not parse VITE_SERVER_DOMAIN: ${url}`, e);
        return null;
    }
}

const hostname = extractHostname(serverDomain);
const allowedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

if (hostname) {
    // Add the extracted hostname to allowed hosts for development server
    // This allows access via the production/admin-configured domain
    allowedHosts.push(hostname);
    console.log(`[Vite Config] Added server host to allowedHosts: ${hostname}`);
}


// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        // Inject version from package.json as a global variable
        '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || packageJson.version || '0.0.0')
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/tests/setup.js', // Optional, if needed later
        exclude: ['**/node_modules/**', '**/e2e/**'], // Exclude Playwright tests
    },
    resolve: {
        alias: {
            '~': path.resolve(__dirname, './src'),
        },
    },
    server: {
        watch: {
            usePolling: true,
        },
        host: true,
        strictPort: true,
        port: 3000,
        // Dynamically configure allowedHosts based on the server domain env variable
        allowedHosts: allowedHosts,
    }
})
