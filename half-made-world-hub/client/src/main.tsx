import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = 
    '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#c25e4a;font-family:Georgia,serif;font-size:18px;text-align:center;padding:40px;">' +
    'Failed to mount: the #root element was not found.</div>';
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (err) {
    rootEl.innerHTML = 
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:#c25e4a;font-family:Georgia,serif;font-size:16px;text-align:center;padding:40px;gap:12px;">' +
      '<strong style="font-size:20px;">The application failed to start.</strong>' +
      '<p style="color:rgba(235,230,216,0.7);max-width:540px;">' +
      (err instanceof Error ? err.message : String(err)) +
      '</p>' +
      '<button onclick="location.reload()" style="margin-top:12px;padding:8px 18px;border:1px solid rgba(200,168,118,0.4);background:rgba(200,168,118,0.12);color:#ebe6d8;border-radius:8px;cursor:pointer;font-family:Georgia,serif;">Retry</button>' +
      '</div>';
    console.error('App failed to mount:', err);
  }
}
