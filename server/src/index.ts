import Fastify, { FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const server = Fastify({ logger: true });

server.register(websocket);

server.register(async function (fastify) {
  
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  fastify.get('/ws', { websocket: true }, (connection: { socket: WebSocket }, req: FastifyRequest) => {
    console.log('Client connected');

    connection.socket.on('message', (msg) => {
      const text = msg.toString();
      console.log('Received:', text);

      connection.socket.send(JSON.stringify({
        type: 'PONG',
        payload: 'Server received: ' + text
      }));
    });

    connection.socket.on('close', () => {
      console.log('Client disconnected');
    });
  });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
