// Service Worker for background notifications
const DB_NAME = 'TodoNotificationsDB';
const DB_VERSION = 1;
const STORE_NAME = 'todos';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Save todos to IndexedDB
async function saveTodos(todos) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Clear existing todos
  await store.clear();
  
  // Add new todos
  for (const todo of todos) {
    await store.put(todo);
  }
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get todos from IndexedDB
async function getTodos() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Check for overdue todos and send notifications
async function checkOverdueTodos() {
  try {
    const todos = await getTodos();
    const now = Date.now();
    const notifiedKey = 'notified_todos';
    
    // Get list of already notified todo IDs
    const notified = await self.caches.open('notifications-cache').then(cache => 
      cache.match(notifiedKey).then(response => 
        response ? response.json() : []
      )
    );
    
    const newNotified = [...notified];
    
    for (const todo of todos) {
      if (
        todo.dueDate &&
        !todo.completed &&
        !todo.deletedAt &&
        todo.dueDate <= now &&
        !notified.includes(todo.id)
      ) {
        // Send notification
        await self.registration.showNotification('Todo Overdue!', {
          body: `"${todo.title}" is now overdue`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: todo.id,
          requireInteraction: true,
          actions: [
            { action: 'complete', title: 'Mark Complete' },
            { action: 'view', title: 'View Todo' }
          ]
        });
        
        newNotified.push(todo.id);
      }
    }
    
    // Save updated notified list
    if (newNotified.length > notified.length) {
      const cache = await self.caches.open('notifications-cache');
      await cache.put(notifiedKey, new Response(JSON.stringify(newNotified)));
    }
  } catch (error) {
    console.error('Error checking overdue todos:', error);
  }
}

// Service Worker Install
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Service Worker Activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data.type === 'UPDATE_TODOS') {
    event.waitUntil(saveTodos(event.data.todos));
  } else if (event.data.type === 'CHECK_OVERDUE') {
    event.waitUntil(checkOverdueTodos());
  }
});

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-overdue-todos') {
    event.waitUntil(checkOverdueTodos());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'complete') {
    // Send message to clients to mark todo complete
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'COMPLETE_TODO',
            todoId: event.notification.tag
          });
        }
      })
    );
  } else {
    // Open or focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        // Check if there's already a window open
        for (const client of clients) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exist
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

// Check for overdue todos every time service worker wakes up
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-overdue') {
    event.waitUntil(checkOverdueTodos());
  }
});

// Periodic check (runs when service worker wakes up)
setInterval(() => {
  checkOverdueTodos();
}, 60000); // Check every minute when active
