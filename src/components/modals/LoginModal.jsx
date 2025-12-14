import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../ui/Icons';

const LoginModal = () => {
    const { login, register } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);

    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Register State
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regName, setRegName] = useState('');

    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (!result.success) {
            setError(result.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        const result = await register(regUsername, regPassword, regName);
        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                        <Icons.Layout className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestor de Tareas</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Inicia sesión para continuar</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                {!isRegistering ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email</label>
                            <input
                                type="email"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                placeholder="ejemplo@correo.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 mt-2">
                            Entrar
                        </button>
                        <div className="text-center mt-4">
                            <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-indigo-400 hover:text-indigo-300">
                                ¿No tienes cuenta? Regístrate
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Nombre Completo</label>
                            <input
                                type="text"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email</label>
                            <input
                                type="email"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Contraseña</label>
                            <input
                                type="password"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 mt-2">
                            Registrarse
                        </button>
                        <div className="text-center mt-4">
                            <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
