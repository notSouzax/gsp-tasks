import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'white', background: '#1a1a1a', height: '100vh', overflow: 'auto' }}>
                    <h1>Algo salió mal.</h1>
                    <p>Por favor, recarga la página o contacta con soporte.</p>
                    <pre style={{ color: 'red', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <pre style={{ marginTop: '1rem', fontSize: '0.8em', opacity: 0.7 }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '2rem', padding: '10px 20px', cursor: 'pointer' }}
                    >
                        Recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
