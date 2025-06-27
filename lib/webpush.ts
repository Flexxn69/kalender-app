// lib/webpush.ts
import webpush from 'web-push';

// VAPID Keys generieren (nur einmal, dann speichern!)
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log(vapidKeys);

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(subscription: any, data: any) {
  await webpush.sendNotification(subscription, JSON.stringify(data));
}
