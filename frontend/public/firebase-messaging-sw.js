/* Background push handler - phải trùng config với frontend/.env */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCR9GuqnDWFcMtq3bQBEuYWz0UadbBfNW8',
  authDomain: 'local-ai-6b086.firebaseapp.com',
  projectId: 'local-ai-6b086',
  storageBucket: 'local-ai-6b086.firebasestorage.app',
  messagingSenderId: '609510343353',
  appId: '1:609510343353:web:8485667cbce5a35e219168',
});

firebase.messaging().onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification?.title || 'PokeShop', {
    body: payload.notification?.body,
    icon: '/pokeball.svg',
    data: payload.data,
  });
});
