const express = require("express");
const path = require("path");
const event = require("events");
const fs = require("fs");
const chalk = require("react-dev-utils/chalk");
const Watcher = require("./Watcher");

const appOptions = {
  port: 1314,
  dir: path.join(process.cwd(), "mock"),
};
console.log(appOptions);

class WebpackMockServerPlugin {
  method = ["get", "post", "delete", "put"];
  constructor(opt) {
    this.options = Object.assign(appOptions, opt);
    this.apply();
  }
  apply() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.listen();
  }
  listen() {
    const port = this.options.port;
    this.server = this.app.listen(port, () => {
      console.log(chalk.green(`mock start: http://localhost: ${port}`));
    });
    this.createRouter();
    this.createWather();
    this.subscribeProcess();
  }
  isvalid(d) {
    return typeof d === "object" && !Array.isArray(d);
  }
  createWather() {
    this.watcher = new Watcher(this.options.dir);
    this.watcher.on("process", (dir) => {
      this.createRouter();
    });
    this.watcher.start();
  }

  createApi(router, mock, filepath) {
    const paths = Object.keys(mock);

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (path.startsWith("/")) {
        router.get(path, (req, res) => {
          const value = mock[path];
          let _value = value;
          if (typeof value === "function") {
            _value = value(req, res);
          }
          res.json(this.formatData({ data: _value }));
        });
      }

      const method = this.method.find((m) => {
        if (path.toLocaleLowerCase().startsWith(m)) {
          return true;
        }
      });

      if (method) {
        router[method](path.toLocaleLowerCase().replace(method, "").trim())((req, res) => {
          let value = mock[path];
          let _value = value;
          if (typeof value === "function") {
            _value = value(req, res);
          }
          res.json(this.formatData({ data: _value }));
        });
      }
    }
  }
  deleteRouter() {
    if (!this.app._router || !Array.isArray(this.app._router.stack)) return;
    const index = this.app._router.stack.findIndex((router) => {
      return router.name === "router";
    });
    if (index > -1) {
      this.app._router.stack.splice(index, 1);
    }
  }
  createRouter() {
    this.deleteRouter();
    const dir = this.options.dir;
    const router = express.Router();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filepath = dir + "/" + file;
      delete require.cache[require.resolve(filepath)];
      const mock = require(filepath);

      if (this.isvalid(mock)) {
        this.createApi(router, mock, filepath);
      }

      if (typeof mock === "function") {
        const _mock = mock();
        if (this.isvalid(_mock)) {
          this.createApi(router, _mock, filepath);
        }
      }
    });
    this.app.use(router);
  }
  formatData({ code = 200, data = {}, message = "成功" }) {
    return {
      code,
      data,
      message,
    };
  }
  subscribeProcess() {
    var that = this;
    ["SIGINT", "SIGTERM"].forEach(function (sig) {
      process.on(sig, function () {
        that.server.close();
        process.exit();
      });
    });

    if (process.env.CI !== "true") {
      // Gracefully exit when stdin ends
      process.stdin.on("end", function () {
        that.server.close();
        process.exit();
      });
    }
  }
}

new WebpackMockServerPlugin({});

module.exports = WebpackMockServerPlugin;
