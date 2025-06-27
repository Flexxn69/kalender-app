import { useAppStore } from "@/lib/store"

export function addNotificationIfEnabled(
  type: string,
  payload: { title: string; description: string; href?: string }
) {
  // Hole Notification-Settings aus localStorage (wie im Settings-Tab gespeichert)
  let settings: any = {}
  if (typeof window !== "undefined") {
    settings = JSON.parse(localStorage.getItem("notifications") || "{}")
  }

  // Mapping Typ zu Setting-Schalter
  const typeToSetting: Record<string, string> = {
    event: "newEventsEnabled",
    eventChange: "eventChangesEnabled",
    reminder: "reminderEnabled",
    mention: "mentionsEnabled",
    group: "groupChangesEnabled",
    newMember: "newMembersEnabled",
    message: "newMessagesEnabled"
  }
  const settingField = typeToSetting[type]

  // Nur Notification, wenn aktiviert (Standard: true, falls kein Setting vorhanden)
  if (!settingField || settings[settingField] !== false) {
    useAppStore.getState().addNotification(type, payload)
  }
}

// Push-Benachrichtigungen für Smartphones (Web Push API)
// In app/lib/notify.ts (oder neu anlegen, falls nicht vorhanden):

export async function enablePushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.')
    return false
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    alert('Benachrichtigungen wurden nicht erlaubt.')
    return false
  }
  // Service Worker registrieren (falls noch nicht geschehen)
  const reg = await navigator.serviceWorker.register('/service-worker.js')
  // Hier könntest du einen Push-Subscription-Request an deinen Server senden
  // (z.B. reg.pushManager.subscribe(...))
  return true
}

// Push-Subscription im Frontend (z.B. in lib/notify.ts):
export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
  });
  // An Server senden
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
  return subscription;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
