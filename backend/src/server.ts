import 'dotenv/config';
import { testPostgresConnection } from './config/postgres';
import app from './app';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await testPostgresConnection();
    app.listen(PORT, async () => {
      console.log('Server is running on port 3000');
    });
  } catch (err) {
    console.error('Failed to startup:');
    process.exit(1);
  }
};

startServer();
