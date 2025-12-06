import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        // Inject version from package.json as a global variable
        '__APP_VERSION__': JSON.stringify(packageJson.version)
    },
    server: {
        watch: {
            usePolling: true,
        },
        host: true,
        strictPort: true,
        port: 3000,
    }
})