import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database.js';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

initializeDatabase();

app.use(routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Sabong backend running on port ${PORT}`);
});
