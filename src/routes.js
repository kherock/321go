import Router from 'koa-router';

import Room from './models/room';
import { isBase62, randomBase62 } from './utils';

const router = new Router();

router
  .get('/', (ctx) => {
    ctx.body = 'Hello!';
  })
  .post('/', (ctx) => {
    let roomId;
    do {
      roomId = randomBase62(5);
    } while (Room.exists(roomId));
    ctx.body = roomId;
  });

router
  .get('/:roomId', async (ctx) => {
    let room = Room.get(ctx.params.roomId);
    if (ctx.upgrade) return ctx.upgrade();
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

router.param('roomId', (id, ctx, next) => {
  if (id.length !== 5 || !isBase62(id)) ctx.throw(400, 'Bad room ID');
  return next();
});

export default router.routes();
