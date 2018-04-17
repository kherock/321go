const rooms = new Map();

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
    this.clients = new Set();
    rooms.set(id, this);
  }

  get users() {
    return this.clients.size;
  }

  join(socket) {
    this.clients.add(socket);
    socket.send(JSON.stringify({ type: 'SYNCHRONIZE', ...this.toJSON() }));
  }

  leave(socket) {
    this.clients.delete(socket);
    if (!this.users) {
      rooms.delete(this.id);
      console.log('room ' + this.id + ' destroyed');
    }
  }

  broadcast(message, fromSocket) {
    switch (message.type) {
    case 'URL':
      this.href = message.href;
      break;
    case 'PLAYING':
      this.state = 'playing';
      break;
    case 'PAUSE':
      this.state = 'paused';
      break;
    default:
      break;
    }
    for (const socket of this.clients) {
      if (socket === fromSocket) continue;
      socket.send(JSON.stringify(message));
    }
  }

  toJSON() {
    return { ...this, clients: undefined };
  }
}
Room.ALLOWED_MESSAGES = [
  'URL',
  'PLAYING',
  'PAUSE',
];
