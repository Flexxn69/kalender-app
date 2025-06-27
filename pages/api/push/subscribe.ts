// pages/api/push/subscribe.ts
import { NextApiRequest, NextApiResponse } from 'next';

// In-memory store für Demo-Zwecke (in Produktion: DB!)
let subscriptions: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({ message: 'Subscription gespeichert' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export function getAllSubscriptions() {
  return subscriptions;
}
