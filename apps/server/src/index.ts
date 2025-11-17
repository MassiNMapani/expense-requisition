import app from './app';
import env from './config/env';
import { connectDatabase } from './lib/db';
import { logger } from './lib/logger';

async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

void bootstrap();
