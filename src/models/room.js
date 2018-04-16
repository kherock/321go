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
    this.clients = new Set();
    rooms.set(id, this);
  }

  join(socket) {
    this.clients.add(socket);
  }

  leave(socket) {
    this.clients.delete(socket);
    if (!this.clients.size) {
      rooms.delete(this.id);
      console.log('room ' + this.id + ' destroyed');
    }
  }

  broadcast(fromSocket, message) {
    for (const socket of this.clients) {
      if (socket === fromSocket) continue;
      socket.send(JSON.stringify(message));
    }  
  }
}

