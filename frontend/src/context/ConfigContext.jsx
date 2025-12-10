import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    const [globalConfig, setGlobalConfig] = useState({
        test_mode: false,
        registration_enabled: true,
        email_2fa_enabled: false,
        support_chat_enabled: false,
        legal: {}
    });
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceReason, setMaintenanceReason] = useState('startup');

    const fetchConfig = () => {
        fetch(`${API_URL}/public-config`)
            .then(res => {
                if (res.status === 503) {
                    setMaintenanceMode(true);
                    setMaintenanceReason('startup');
                    throw new Error("Maintenance Mode");
                }
                return res.json();
            })
            .then(data => {
                setGlobalConfig(data);
                if (data.maintenance_mode) {
                    setMaintenanceMode(true);
                    setMaintenanceReason('manual');
                } else if (maintenanceMode) {
                    setMaintenanceMode(false);
                }
            })
            .catch(e => {
                console.error("Config fetch error", e);
                if (e.message === "Maintenance Mode" || e.name === "TypeError") {
                    setMaintenanceMode(true);
                    setMaintenanceReason('startup');
                }
            });
    };

    useEffect(() => {
        // Initial Fetch
        fetchConfig();

        // Polling if in maintenance mode (every 5 seconds)
        let interval;
        if (maintenanceMode) {
            interval = setInterval(fetchConfig, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [maintenanceMode]);

    return (
        <ConfigContext.Provider value={{ globalConfig, maintenanceMode, maintenanceReason, fetchConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
