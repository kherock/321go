const debug = require('debug')('koa-ws-upgrade');
const http = require('http');
const Koa = require('koa');
const compose = require('koa-compose');
const ws = require('ws');

const kWsServer = Symbol('wss');

module.exports = class WsApplication extends Koa {
  constructor(WsServer = ws.Server) {
    super();
    this[kWsServer] = new WsServer({ noServer: true });
    this.clients = this[kWsServer].clients;
    this.use(async (ctx, next) => {
      if (!ctx.upgrade) return next();

      ctx.res.statusCode = 101;
      await next();
      if (ctx.respond !== false && ctx.status === 101) {
        await ctx.upgrade();
      }
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

  createContext(req, socket, head) {
    const res = new http.ServerResponse(req);
    res.assignSocket(socket);
    const context = super.createContext(req, res);
    context.upgrade = context.response.upgrade = async function upgrade() {
      context.respond = false;
      const client = await new Promise(resolve => context.app[kWsServer].handleUpgrade(req, socket, head, resolve));
      context.app.emit('connection', client, context);
      return client;
    };

    return context;
  }
};
