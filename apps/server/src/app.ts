import express from 'express';
import cors from 'cors';

import routes from './routes';
import { uploadsPath } from './config/storage';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsPath));

app.use('/api', routes);

app.use((req, res) => {
  return res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

export default app;
