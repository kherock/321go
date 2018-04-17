const debug = require('debug')('koa-ws');
const http = require('http');
const Koa = require('koa');
const compose = require('koa-compose');
const ws = require('ws');

const wsServer = Symbol('koa-ws');

module.exports = class Application extends Koa {
  constructor(WsServer = ws.Server) {
    super();
    this[wsServer] = new WsServer({ noServer: true });
    this.clients = this[wsServer].clients;
    this.use((ctx, next) => {
      ctx.res.statusCode = 101;
      return next();
    });
  }

  listen(...args) {
    debug('listen');
    const server = http.createServer((req, res) => {
      const body = http.STATUS_CODES[426];

      res.writeHead(426, {
        'Content-Length': body.length,
        'Content-Type': 'text/plain',
      });
      res.end(body);
    });
    server.on('upgrade', this.callback());
    server.listen(...args);
    return server;
  }

  callback() {
    const fn = compose(this.middleware);

    if (!this.listeners('error').length) this.on('error', this.onerror);

    const handleUpgrade = (req, socket, head) => {
      const ctx = this.createContext(req, socket, head);
      this.handleRequest(ctx, fn);
    };

    return handleUpgrade;
  }

  createContext(req, socket, upgradeHead) {
    const dummyRes = {
      end(message) {
        if (this.statusCode !== 101) {
          abortHandshake(socket, this.statusCode, message || this.statusMessage);
        } else {
          context.app[wsServer].handleUpgrade(req, socket, upgradeHead, (ws) => {
            context.app.emit('connection', ws, context.state);
          });
        }
      },
      getHeader() {},
      setHeader() {}
    };
    const context = super.createContext(req, dummyRes);

    return context;
  }
}

/**
 * Close the connection when preconditions are not fulfilled.
 *
 * @param {net.Socket} socket The socket of the upgrade request
 * @param {Number} code The HTTP response status code
 * @param {String} [message] The HTTP response body
 * @private
 */
function abortHandshake(socket, code, message) {
  if (socket.writable) {
    message = message || http.STATUS_CODES[code];
    socket.write(
      `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
      'Connection: close\r\n' +
      'Content-type: text/html\r\n' +
      `Content-Length: ${Buffer.byteLength(message)}\r\n` +
      '\r\n' +
      message
    );
  }
  socket.destroy();
}
