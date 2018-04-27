const rooms = new Map();

const kClients = Symbol('clients');
const kPlayerTime = Symbol('playerTime');
const kServerTime = Symbol('serverTime');

export default class Room {
  static get(id) {
    return rooms.get(id);
  }

  static ensureExists(id) {
    return rooms.get(id) || new Room(id);
  }

  static exists(id) {
    return rooms.has(id);
  }

  constructor(id) {
    this.id = id;
    this[kClients] = new Set();
    rooms.set(id, this);
  }

  get users() {
    return this[kClients].size;
  }

  get currentTime() {
    return this[kServerTime] === undefined
      ? this[kPlayerTime]
      : this[kPlayerTime] + (Date.now() - this[kServerTime]) / 1000;
  }

  join(socket) {
    this[kClients].add(socket);
    socket.send(JSON.stringify({ type: 'SYNCHRONIZE', ...this.toJSON() }));
  }

  leave(socket) {
    this[kClients].delete(socket);
    if (!this.users) {
      rooms.delete(this.id);
      console.log('room ' + this.id + ' destroyed');
    }
  }

  broadcast(message, fromSocket) {
    switch (message.type) {
    case 'URL':
      this.href = message.href;
      this.state = undefined;
      this[kPlayerTime] = undefined;
      this[kServerTime] = undefined;
      break;
    case 'PLAYING':
      this.state = 'playing';
      this[kPlayerTime] = message.currentTime;
      this[kServerTime] = Date.now();
      break;
    case 'PAUSE':
      this.state = 'paused';
      this[kPlayerTime] = message.currentTime;
      this[kServerTime] = undefined;
      break;
    default:
      break;
    }
    for (const socket of this[kClients]) {
      if (socket === fromSocket) continue;
      socket.send(JSON.stringify(message));
    }
  }

  toJSON() {
    return {
      ...this,
      users: this.users,
      currentTime: this.currentTime,
    };
  }
}
Room.ALLOWED_MESSAGES = [
  'URL',
  'PLAYING',
  'PAUSE',
];
