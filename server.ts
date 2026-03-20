import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook endpoint for Agile CRM
  app.post('/api/webhook/agile-leads', async (req, res) => {
    try {
      const leadData = req.body;
      
      // Map Agile CRM data to our Course entity
      // This mapping depends on what Agile CRM sends.
      // We'll assume a standard structure and the user can adjust.
      const newCourse = {
        name: leadData.course_name || leadData.name || 'New Lead from Agile',
        referenceNumber: leadData.reference || `AG-${Date.now()}`,
        startDate: leadData.start_date || new Date().toISOString().split('T')[0],
        endDate: leadData.end_date || new Date().toISOString().split('T')[0],
        location: leadData.location || 'Online',
        status: 'request', // Default status for new leads
        clientName: leadData.client_name || leadData.contact_name || 'N/A',
        clientPhone: leadData.client_phone || leadData.phone || 'N/A',
        clientCompany: leadData.client_company || leadData.company || 'N/A',
        createdAt: new Date().toISOString(),
        source: 'Agile CRM Webhook'
      };

      const docRef = await db.collection('courses').add(newCourse);
      
      console.log('Lead synced from Agile CRM:', docRef.id);
      res.status(200).json({ success: true, id: docRef.id });
    } catch (error) {
      console.error('Webhook Error:', error);
      res.status(500).json({ error: 'Failed to sync lead' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
