const event = require("events");
const fs = require("fs");

class Watcher extends event.EventEmitter {
  constructor(watchDir) {
    super();
    this.watchDir = watchDir;
    this.watchList = new Set();
  }

  watch() {
    this.watchList.forEach((value) => {
      fs.unwatchFile(value);
      fs.watch(value, { persistent: false, recursive: true }, (_, filename) => {
        console.log("mock data changed", filename);
        try {
          this.emit("process", filename);
        } catch (error) {
          console.log(error);
        }
      });
    });
  }

  addFileDir(watchDir) {
    if (fs.lstatSync(watchDir).isDirectory()) {
      this.watchList.add(`${watchDir}`);
    }
  }

  start() {
    this.addFileDir(this.watchDir);
    this.watch();
  }
}

module.exports = Watcher;
