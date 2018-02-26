import app from './src/app';

app.server.listen(process.env.PORT || 3000, (err) => {
  if (err) throw err;
  console.log('Server listening on port ' + app.server.address().port);
});
  