// pages/api/push/send.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllSubscriptions } from './subscribe';
import { sendPushNotification } from '@/lib/webpush';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, body, url } = req.body;
    const payload = { title, body, url };
    const subscriptions = getAllSubscriptions();
    for (const sub of subscriptions) {
      try {
        await sendPushNotification(sub, payload);
      } catch (e) {
        // Fehler ignorieren (z.B. abgelaufene Subscription)
      }
    }
    res.status(200).json({ message: 'Push gesendet' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
