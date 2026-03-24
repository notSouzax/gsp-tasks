import React from 'react';
import logo from '../../assets/logo.jpg';

/**
 * SplashScreen — Premium loading screen shown during auth/workspace/board initialization.
 * @param {{ status?: string }} props
 */
const SplashScreen = ({ status = 'Cargando...' }) => {
    return (
        <div style={styles.container}>
            {/* Animated background glow */}
            <div style={styles.glow} />

            {/* Logo */}
            <div style={styles.logoContainer}>
                <img src={logo} alt="Gestor Pro" style={styles.logo} />
            </div>

            {/* Brand */}
            <h1 style={styles.title}>Gestor Pro</h1>

            {/* Spinner */}
            <div style={styles.spinnerContainer}>
                <svg style={styles.spinner} viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke="url(#spinnerGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="80, 200"
                    >
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 25 25"
                            to="360 25 25"
                            dur="1.2s"
                            repeatCount="indefinite"
                        />
                    </circle>
                    <defs>
                        <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Status */}
            <p style={styles.status}>{status}</p>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
        gap: '16px',
    },
    glow: {
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -55%)',
        pointerEvents: 'none',
    },
    logoContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
        border: '2px solid rgba(99, 102, 241, 0.2)',
        position: 'relative',
        zIndex: 1,
    },
    logo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    title: {
        fontSize: '22px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #c7d2fe, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: 0,
        letterSpacing: '0.5px',
        position: 'relative',
        zIndex: 1,
    },
    spinnerContainer: {
        marginTop: '8px',
        position: 'relative',
        zIndex: 1,
    },
    spinner: {
        width: '40px',
        height: '40px',
    },
    status: {
        fontSize: '13px',
        color: '#94a3b8',
        margin: 0,
        letterSpacing: '0.3px',
        position: 'relative',
        zIndex: 1,
    },
};

export default SplashScreen;
