import React from 'react';
import Dashboard from '../components/Dashboard';

const DashboardPage = ({ boards, onNavigateToTask }) => {
    return <Dashboard boards={boards} onNavigateToTask={onNavigateToTask} />;
};

export default DashboardPage;
