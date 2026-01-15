import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 segundos - datos considerados frescos
      gcTime: 5 * 60 * 1000, // 5 minutos - tiempo en caché
      refetchOnWindowFocus: true, // Refetch al volver a la ventana
      retry: 2, // Reintentos en caso de error
    },
  },
});

const Root = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById('root')).render(<Root />);
