import dotenv from 'dotenv';
dotenv.config();

import { buildServer } from './app';

const app = buildServer();
const port = Number(process.env.PORT) || 3001;

app.listen({ port, host: '0.0.0.0' }).catch(err => {
    app.log.error(err);
    process.exit(1);
});
