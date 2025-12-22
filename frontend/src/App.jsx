
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import AppRouter from './router/AppRouter';
import './index.css';

const App = () => {
    return (
        <ConfigProvider>
            <I18nProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <AppRouter />
                    </AuthProvider>
                </ThemeProvider>
            </I18nProvider>
        </ConfigProvider>
    );
};

export default App;