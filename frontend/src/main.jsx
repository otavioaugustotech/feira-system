import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { aquecerApi } from './services/api.js';
import './styles/global.css';

aquecerApi(); /* ⭐ acorda a API (Render free) enquanto a tela carrega */

/* ⭐ Login com Google: o Client ID vem do frontend/.env (VITE_GOOGLE_CLIENT_ID).
   Sem ele, o app funciona normalmente, só não mostra o botão do Google. */
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId} locale="pt-BR">
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
