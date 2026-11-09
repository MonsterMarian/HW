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
          padding: '30px',
          backgroundColor: '#07080A',
          color: '#00F0FF',
          fontFamily: 'monospace',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ color: '#FF3366', fontSize: '20px', marginBottom: '10px' }}>
            [!] SILICON ENGINE HARDWARE FAULT (KERNEL PANIC)
          </h1>
          <p style={{ color: '#ccc', marginBottom: '20px' }}>{this.state.error?.toString()}</p>
          <pre style={{
            background: '#0B0F19',
            padding: '15px',
            borderRadius: '6px',
            border: '1px solid #1F293D',
            overflow: 'auto',
            color: '#8892B0',
            fontSize: '11px'
          }}>
            {this.state.info?.componentStack || this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#00F0FF',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '160px'
            }}
          >
            RELOAD SYSTEM
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
