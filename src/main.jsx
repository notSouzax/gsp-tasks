import { createRoot } from 'react-dom/client'
import './index.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Root = () => {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

createRoot(document.getElementById('root')).render(<Root />);
