import http from 'http';
import cors from 'kcors';
import Koa from 'koa';
import mount from 'koa-mount';
import KoaWsUpgrade from './lib/koa-ws-upgrade';

import Room from './models/room';
import routes from './routes';
import { randomBase62 } from './utils';

const app = new Koa();
app.ws = new KoaWsUpgrade();
app.server = http.createServer();
export default app;

app.use(cors());
app.use(routes);

app.ws.use(mount(app));
app.ws.on('connection', (socket, ctx) => {
  socket.id = randomBase62(15);
  const { roomId } = ctx.params;
  console.log(socket.id + ' joined room ' + roomId);

  const room = Room.ensureExists(roomId);
  room.join(socket);

  socket.on('message', (message) => {
    if (message instanceof Buffer && !message.length) {
      // heartbeat
      return socket.send();
    }
    try {
      message = JSON.parse(message);
    } catch (err) { return; }
    if (!message) return;
    console.log(message);
    if (!Room.ALLOWED_MESSAGES.includes(message.type)) return;

    room.broadcast(message, socket);
  });

  socket.on('close', () => {
    console.log(socket.id + ' left ' + room.id);
    room.leave(socket);
  });
});

app.server.on('request', app.callback());
app.server.on('upgrade', app.ws.callback());
