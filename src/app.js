import http from 'http';
import cors from 'kcors';
import Koa from 'koa';
import { SCServer } from 'socketcluster-server';

import routes from './routes';
import { isBase62 } from './utils';

const app = new Koa();
export default app;

app.server = http.createServer(app.callback());
app.scServer = new SCServer({
  httpServer: app.server,
  socketChannelLimit: 1
});

app.use(cors());
app.use(routes);

const ALLOWED_MESSAGES = [
  'URL',
  'PLAYING',
  'PAUSE'
];

const rooms = app.context.rooms = new Map();

app.scServer.addMiddleware('subscribe', (req, next) => {
  if (req.channel.length !== 5 || !isBase62(req.channel)) {
    return next(new Error('Bad room ID'));
  }
  next();
});

app.scServer.addMiddleware('publishIn', (req, next) => {
  if (!req.data) return next(new Error('Message cannot be empty'));
  if (!ALLOWED_MESSAGES.includes(req.data.type)) {
    return next(new Error('Bad message type'));
  }
  req.data.socket = req.socket.id;
  next();
});

app.scServer.addMiddleware('publishOut', (req, next) => {
  if (req.data.socket === req.socket.id) return next(true);
  req.data = { ...req.data };
  delete req.data.socket;
  next();
});

function initRoom(roomId) {
  const channel = app.scServer.exchange.subscribe(roomId);
  const room = {
    users: 0,
    watcher: channel.watch((message) => {
      console.log(message);
      if (message.type === 'URL') {
        room.href = message.href;
      }
    })
  };
  rooms.set(roomId, room);
}

app.scServer.on('connection', (socket) => {
  console.log(socket.id + ' connected');
  socket.on('disconnect', () => {
    console.log(socket.id + ' disconnected');
  });
  socket.on('subscribe', (channelName) => {
    console.log(socket.id + ' subscribed to ' + channelName);
    if (!rooms.has(channelName)) {
      initRoom(channelName);
    }
    const room = rooms.get(channelName);
    room.users++;
    socket.emit('#publish', {
      channel: channelName,
      data: { type: 'SYNCHRONIZE', href: room.href }
    });
  });
  socket.on('unsubscribe', (channelName) => {
    console.log(socket.id + ' unsubscribed from ' + channelName);
    const room = rooms.get(channelName);
    room.users--;
    if (!room.users) {
      app.scServer.exchange.channel(channelName).destroy();
      rooms.delete(channelName);
      console.log('room ' + channelName + ' destroyed');
    }
  });
});
