# webpack-mock-server-plugin

## example

```js

  // webpack.config.js
  const WebpackMockServerPlugin = reuqire('webpack-mock-server-plugin');
  const path = require('path');
  {
  ...
    plugins: [
      new WebpackMockServerPlugin({
        dir: path.resolve(process.cwd(), '/mock'), // mock目录
        port: '8080', // mock服务端口
      })
    ]
  };

```

/mock/api.js

```js
  module.exports = {
    '/test': {code: 0, data: 'mockdata'}, // get
    'GET /test': {code: 0, data: 'mockdata'}, // get
    'POST /test': {code: 0, data: 'mockdata'}, // post
    'POST /test': (req) => {
      return {code: 0, data: 'mockdata'}
    }, // post
    'PUT /test': {code: 0, data: 'mockdata'}, // put
    'DELETE /test': {code: 0, data: 'mockdata'}, // delete
  }
```
