import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const form = new formidable.IncomingForm({ uploadDir: './public/uploads', keepExtensions: true });
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload fehlgeschlagen' });
    res.status(200).json({ files });
  });
}
