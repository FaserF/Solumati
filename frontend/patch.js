import fs from 'fs';

const filesToUpdate = [
    'src/tests/OfflineMode.test.jsx',
    'src/tests/AuthContextToken.test.jsx',
    'src/tests/AuthenticationIntegration.test.jsx',
    'src/App.test.jsx'
];

filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        if (!content.includes("vi.mock('../components/ThemeContext'")) {
            const mock = `
vi.mock('../components/ThemeContext', () => ({
    useTheme: () => ({ setTheme: vi.fn(), theme: 'light' }),
    ThemeProvider: ({ children }) => <div>{children}</div>
}));
`;
            
            // Add the mock right after the imports
            content = content.replace(/(import .* from .*;\n+)(?!import)/, `$1${mock}\n`);
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    }
});
