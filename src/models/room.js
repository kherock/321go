const rooms = new Map();

export default class Room {
  static get(id) {
    return rooms.get(id) || new Room(id);
  }

  static exists(id) {
    return rooms.has(id);
  }

  constructor(id) {
    this.id = id;
    this.users = new Set();
    rooms.set(id, this);
  }

  join(socket) {
    this.users.add(socket);
    socket.send(JSON.stringify({ type: 'SYNCHRONIZE', ...this.toJSON() }));
  }

  leave(socket) {
    this.users.delete(socket);
    if (!this.users.size) {
      rooms.delete(this.id);
      console.log('room ' + this.id + ' destroyed');
    }
  }

  broadcast(fromSocket, message) {
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
    for (const socket of this.users) {
      if (socket === fromSocket) continue;
      socket.send(JSON.stringify(message));
    }
  }

  toJSON() {
    return { ...this, user: this.users.size }
  }
}
Room.ALLOWED_MESSAGES = [
  'URL',
  'PLAYING',
  'PAUSE'
];
