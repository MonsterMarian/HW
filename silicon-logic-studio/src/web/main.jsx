import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import './web.css';
import WebApp from './WebApp.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><WebApp /></StrictMode>);
