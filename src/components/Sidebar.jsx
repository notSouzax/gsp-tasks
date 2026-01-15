import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from './ui/Icons';
import logo from '../assets/logo.jpg';
import SettingsModal from './modals/SettingsModal';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div
            className={`
                ${isCollapsed ? 'w-20' : 'w-72'}
                bg-[var(--bg-tertiary)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0 transition-all duration-300 relative z-50
            `}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3.5 top-[26px] w-7 h-7 flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-indigo-500 hover:border-indigo-400 rounded-full shadow-md hover:shadow-lg hover:scale-110 transition-all z-50"
            >
                {isCollapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-[var(--border-subtle)]`}>
                <NavLink
                    to="/"
                    className="flex items-center cursor-pointer group"
                    title="Ir al Dashboard"
                >
                    <div className="relative overflow-hidden rounded-xl">
                        <img src={logo} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
                    </div>
                    {!isCollapsed && (
                        <div className="ml-4 opacity-100 transition-opacity duration-300">
                            <h1 className="font-bold text-lg text-[var(--text-primary)] leading-none tracking-tight group-hover:text-indigo-500 transition-colors">Gestor</h1>
                            <span className="text-xs text-indigo-500 font-medium tracking-wider uppercase">Pro v1.0</span>
                        </div>
                    )}
                </NavLink>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">

                {/* Section 1: Views */}
                <div className="space-y-1">
                    {!isCollapsed && <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-2">Vistas</div>}
                    <NavItem
                        to="/"
                        title="Dashboard"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                        {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
                    </NavItem>
                    <NavItem
                        to="/tableros"
                        title="Tableros"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">view_kanban</span>
                        {!isCollapsed && <span className="text-sm font-medium">Tableros</span>}
                    </NavItem>
                    <NavItem
                        to="/crm"
                        title="CRM"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">handshake</span>
                        {!isCollapsed && <span className="text-sm font-medium">CRM</span>}
                    </NavItem>
                    <NavItem
                        to="/automations"
                        title="Automatizaciones"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                        {!isCollapsed && <span className="text-sm font-medium">Automatizaciones</span>}
                    </NavItem>
                    <NavItem
                        to="/calendar"
                        title="Calendario"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        {!isCollapsed && <span className="text-sm font-medium">Calendario</span>}
                    </NavItem>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <NavButton
                    onClick={() => setShowSettings(true)}
                    active={showSettings}
                    title="Configuración"
                    collapsed={isCollapsed}
                >
                    <Icons.Settings size={20} className={showSettings ? "animate-spin-slow" : ""} />
                    {!isCollapsed && <span className="text-sm font-medium">Configuración</span>}
                </NavButton>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default Sidebar;

const NavItem = ({ to, children, title, collapsed }) => (
    <NavLink
        to={to}
        title={title}
        className={({ isActive }) => `
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
            ${isActive
                ? 'bg-indigo-500/10 dark:bg-gradient-to-r dark:from-indigo-600/20 dark:via-indigo-500/10 dark:to-transparent text-indigo-600 dark:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }
            ${collapsed ? 'justify-center px-0' : ''}
        `}
    >
        {({ isActive }) => (
            <>
                {isActive && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                {children}
            </>
        )}
    </NavLink>
);

const NavButton = ({ active, children, onClick, title, collapsed }) => (
    <button
        onClick={onClick}
        title={title}
        className={`
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
            ${active
                ? 'bg-indigo-500/10 dark:bg-gradient-to-r dark:from-indigo-600/20 dark:via-indigo-500/10 dark:to-transparent text-indigo-600 dark:text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }
            ${collapsed ? 'justify-center px-0' : ''}
        `}
    >
        {active && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
        {children}
    </button>
);
