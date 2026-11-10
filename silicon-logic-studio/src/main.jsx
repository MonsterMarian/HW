import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CRITICAL APP ERROR:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          backgroundColor: 'var(--bg-dark)',
          color: 'var(--text-light)',
          fontFamily: 'var(--font-sans)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <p className="meta" style={{ color: 'var(--conflict)', marginBottom: '12px' }}>Chyba aplikace</p>
          <h1 style={{ fontSize: '40px', lineHeight: 1, marginBottom: '16px' }}>
            Něco se <span className="serif-accent">pokazilo</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{this.state.error?.toString()}</p>
          <pre style={{
            background: 'var(--bg-card)',
            padding: '15px',
            border: '1px solid var(--line)',
            overflow: 'auto',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px'
          }}>
            {this.state.info?.componentStack || this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="meta"
            style={{
              marginTop: '20px',
              padding: '12px 20px',
              backgroundColor: 'var(--accent-amber)',
              color: 'var(--bg-dark)',
              border: 'none',
              width: '180px'
            }}
          >
            Načíst znovu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
