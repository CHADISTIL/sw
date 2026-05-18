self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => new Response(''))));

// ── إشعارات التحميل ──
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'DOWNLOAD_PROGRESS') {
    const pct   = e.data.pct || 0;
    const title = e.data.title || 'تحميل';
    if (pct >= 100) {
      self.registration.showNotification('اكتمل التحميل', {
        body:    title + ' - تم التحميل بنجاح',
        icon:    'https://i.suar.me/Epwvv',
        badge:   'https://i.suar.me/Epwvv',
        tag:     'dl-done',
        vibrate: [200, 100, 200]
      }).catch(() => {});
    } else if (pct > 0 && pct % 25 === 0) {
      self.registration.showNotification('جاري التحميل... ' + pct + '%', {
        body:   title,
        icon:   'https://i.suar.me/Epwvv',
        badge:  'https://i.suar.me/Epwvv',
        tag:    'dl-progress',
        silent: true
      }).catch(() => {});
    }
  }
});

// ── استقبال Push ──
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}

  // عنوان الإشعار = عنوان المسلسل
  // الوصف       = عنوان الحلقة فقط
  // الصورة      = من TMDB أو Blogger كـ fallback
  const title = data.seriesTitle || data.title || 'jawrab';
  const body  = data.episodeTitle || data.body  || '';
  const icon  = data.icon  || 'https://i.suar.me/Epwvv';
  const badge = data.badge || 'https://i.suar.me/Epwvv';
  const image = data.episodeThumb || data.image || undefined;
  const tag   = data.tag   || ('jawrab-' + Date.now());
  const nd    = data.data  || {};

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image,
      tag,
      requireInteraction: true,
      vibrate: [150, 80, 150],
      data: nd,
      actions: [
        { action: 'open',  title: 'شاهد الآن' },
        { action: 'close', title: 'اغلاق'     },
      ],
    })
  );
});

// ── النقر على الإشعار ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;

  const nd      = e.notification.data || {};
  const openUrl = nd.openUrl || nd.postUrl || self.location.origin;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // إذا كان التطبيق مفتوحاً → أعد التركيز وأرسل رسالة لفتح الحلقة
      for (const client of list) {
        if (client.url.includes(self.location.hostname)) {
          client.focus();
          client.postMessage({ type: 'OPEN_VIDEO', openUrl, data: nd });
          return;
        }
      }
      // إذا كان مغلقاً → افتح رابط مباشرة
      return clients.openWindow(openUrl);
    })
  );
});
