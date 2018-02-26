import http from 'http';
import Koa from 'koa';
import { SCServer } from 'socketcluster-server';

import routes from './routes';
import { isBase62, randomBase62 } from './utils';

const app = new Koa();
app.server = http.createServer(app.callback());
app.scServer = new SCServer({
  httpServer: app.server,
  socketChannelLimit: 1
});

app.use(routes);

const rooms = new Map();

app.scServer.addMiddleware('subscribe', (req, next) => {
  if (req.channel.length !== 5 || !isBase62(req.channel)) {
    return next(new Error('Bad room ID'));
  }
  next();
});

app.scServer.addMiddleware('publishIn', (req, next) => {
  if (!req.data) return next(new Error('Message cannot be empty'));
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
  socket.on('get_room', (data, respond) => {
    let roomId;
    do {
      roomId = randomBase62(5);
    } while (rooms.has(roomId));
    respond(null, roomId);
  });
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
      data: { type: 'OBSERVE_MEDIA', href: room.href }
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

export default app;
