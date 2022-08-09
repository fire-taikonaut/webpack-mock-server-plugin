const express = require("express");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const bodyParser = require("body-parser");
const Watcher = require("./Watcher");

const appOptions = {
  port: 1314,
  dir: path.join(process.cwd(), "mock"),
};

class WebpackMockServerPlugin {
  method = ["get", "post", "delete", "put"];
  constructor(opt) {
    this.options = Object.assign(appOptions, opt);
  }
  apply() {
    this.app = express();
    this.useMiddleWare();
    this.listen();
  }
  listen() {
    const port = this.options.port;
    this.server = this.app.listen(port, () => {
      console.log(`mock start: http://localhost: ${port}`);
    });
    this.createRouter();
    this.createWather();
    this.subscribeProcess();
  }
  useMiddleWare() {
    this.app.use(compression());
    this.app.use(bodyParser.json({ limit: "50mb" }));
    this.app.all("*", function (req, res, next) {
      res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Content-Length , user, Accept, X-Requested-With");
      res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");
      if (req.method == "OPTIONS") {
        res.sendStatus(200);
        return;
      }
      next();
    });
    // this
    this.app.use(express.urlencoded({ extended: false }));
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
        continue;
      }

      const pathArr = path.split(" ");
      const method = this.method.find((m) => {
        if (m === pathArr[0].toLocaleLowerCase()) {
          return true;
        }
      });
      if (method && pathArr[1] && pathArr[1].startsWith("/")) {
        router[method](pathArr[1], (req, res) => {
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

module.exports = WebpackMockServerPlugin;
