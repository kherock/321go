import Router from 'koa-router';

import { randomBase62 } from './utils';

const router = new Router();

router
  .get('/', (ctx) => {
    ctx.body = 'Hello!'
  })
  .post('/', (ctx) => {
    let roomId;
    do {
      roomId = randomBase62(5);
    } while (ctx.rooms.has(roomId));
    ctx.body = roomId;
  });

router
  .get('/:roomId', (ctx) => {
    const room = ctx.rooms.get(ctx.params.roomId);
    if (!room || !room.href) ctx.throw(404);
    switch (ctx.accepts('json', 'html')) {
    case 'json':
      ctx.body = room;
      break;
    case 'html':
      ctx.redirect(room.href);
      break;
    }
  });

export default router.routes();
