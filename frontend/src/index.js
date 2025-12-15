import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            console.log('Notification permission:', permission);
          });
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button/banner (you can customize this)
  console.log('App can be installed');
  
  // Store for later use
  window.deferredPrompt = deferredPrompt;
});

window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully');
  deferredPrompt = null;
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
