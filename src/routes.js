import Router from 'koa-router';

import Room from './models/room';
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
    } while (Room.exists(roomId));
    ctx.body = roomId;
  });

router
  .get('/:roomId', (ctx) => {
    const room = Room.get(ctx.params.roomId);
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
