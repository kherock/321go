import http from 'http';
import cors from 'kcors';
import Koa from 'koa';
import KoaWsUpgrade from './lib/koa-ws-upgrade';

import Room from './models/room';
import routes from './routes';
import { isBase62, randomBase62 } from './utils';

const app = new Koa();
export default app;

app.server = http.createServer();
app.ws = new KoaWsUpgrade();

app.use(cors());
app.use(routes);

app.ws.use((ctx, next) => {
  ctx.state.channelName = ctx.path.slice(1);
  if (ctx.state.channelName.length !== 5 || !isBase62(ctx.state.channelName)) {
    ctx.throw(400, 'Bad room ID');
  }
  return next();
});

app.server.on('request', app.callback());
app.server.on('upgrade', app.ws.callback());

app.ws.on('connection', (socket, state) => {
  socket.id = randomBase62(15);
  console.log(socket.id + ' joined ' + state.channelName);

  Room.get(state.channelName).join(socket);

  socket.on('message', (message) => {
    try {
      message = JSON.parse(message);
    } catch (err) {}
    console.log(message);
    if (!message) return;
    if (!Room.ALLOWED_MESSAGES.includes(message.type)) return;

    const room = Room.get(state.channelName);
    room.broadcast(socket, message);
  });

  socket.on('close', () => {
    console.log(socket.id + ' left ' + state.channelName);
    const room = Room.get(state.channelName);
    room.leave(socket);
  });
});
