import { createApp } from './app';
import { openTargetDb } from './db';
import { env } from './env';

const db = openTargetDb(env.dbPath);
const app = createApp(db);

app.listen(env.port, () => {
  console.log(`Target app listening on http://localhost:${env.port} (db: ${env.dbPath})`);
});
