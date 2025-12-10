import React from 'react';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import AppRouter from './router/AppRouter';
import './index.css';

const App = () => {
    return (
        <ConfigProvider>
            <I18nProvider>
                <AuthProvider>
                    <AppRouter />
                </AuthProvider>
            </I18nProvider>
        </ConfigProvider>
    );
};

export default App;