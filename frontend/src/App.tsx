import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import './App.css';

function AppContent() {
  const [showDashboard, setShowDashboard] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDashboard) {
        setShowDashboard(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [showDashboard]);

  return (
    <div className="app-wrapper" data-theme={theme}>
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : (
        <Landing onEnter={() => setShowDashboard(true)} />
      )}
      
      {showDashboard && (
        <button 
          className="theme-toggle-floating" 
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <span className={`theme-icon ${theme}`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;