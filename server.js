const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (_req, res) => {
  res.send('hello from kubernetes 👋 (v1.1)');
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
