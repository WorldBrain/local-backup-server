var Sentry = require("@sentry/node");
Sentry.init({
  dsn:
    "https://017edee629ad48ddaac2a510df0730c2@o138129.ingest.sentry.io/5274376",
});
process.prependListener("uncaughtException", (err) => {
  Sentry.captureException(err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.log("unhandled rejection");
  promise.catch((err) => Sentry.captureException(err));
});
window.onerror = (...args) => {
  const err = args[4];
  Sentry.captureException(err);
};

var fs = require("fs");
var mkdirp = require("mkdirp");
var Koa = require("koa");
var Router = require("koa-router");
var bodyparser = require("koa-bodyparser");
var gui = require("nw.gui");

let app;
let router;
let server = undefined;
var tray;
var itemOpenBackup;
var itemServerStatus;
var itemStartServer;
var itemStopServer;
var itemServerStatus;

const port = 11922;
let backupPath = "";

// ###########
// Koa Server
// ###########

async function main() {
  app = new Koa();
  router = new Router();

  // error handling
  app.on("error", (err) => {
    Sentry.captureException(err);
  });
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit("error", err, ctx);
    }
  });

  // body parsing
  app.use(
    bodyparser({
      enableTypes: ["text"],
      textLimit: "50mb",
      onerror: function (err, ctx) {
        console.log(err.message);
        ctx.throw("body parse error", 422);
      },
    })
  );

  // getting server status
  router.get("/status", (ctx) => {
    ctx.status = 200;
    ctx.body = "running";
  });

  // get the backup folder location
  router.get("/backup/location", async (ctx) => {
    ctx.body = backupPath;
    ctx.status = 200;
  });

  router.get("/backup/start-change-location", async (ctx) => {
    ctx.body = await selectNewBackupFolder();
    ctx.status = 200;
  });

  // putting new files
  router.put("/backup/:collection/:timestamp", (ctx) => {
    const filename = ctx.params.timestamp;
    const collection = ctx.params.collection;
    const dirpath = backupPath + `/backup/${collection}`;
    mkdirp(dirpath, function (err) {
      if (err) throw err;
      const filepath = dirpath + `/${filename}`;
      fs.writeFile(filepath, ctx.request.body, function (err) {
        console.log({ err, wefw: "three" });
        if (err) throw err;
      });
    });
    ctx.status = 200;
  });

  // getting files
  router.get("/backup/:collection/:timestamp", (ctx) => {
    const filename = ctx.params.timestamp;
    const collection = ctx.params.collection;
    const filepath = backupPath + `/backup/${collection}/` + filename;
    try {
      ctx.body = fs.readFileSync(filepath, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") {
        ctx.status = 404;
        ctx.body = "File not found.";
      } else throw err;
    }
  });

  // listing files
  router.get("/backup/:collection", (ctx) => {
    const collection = ctx.params.collection;
    const dirpath = backupPath + `/backup/${collection}`;
    try {
      let filelist = fs.readdirSync(dirpath, "utf-8");
      filelist = filelist.filter((filename) => {
        // check if filename contains digits only to ignore system files like .DS_STORE
        return /^\d+$/.test(filename);
      });
      ctx.body = filelist.toString();
    } catch (err) {
      if (err.code === "ENOENT") {
        ctx.status = 404;
        ctx.body = "Collection not found.";
      } else throw err;
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  if (await loadBackupLocation()) {
    await startServer();
  }

  tray = new nw.Tray({
    tooltip: "Memex Backup Helper",
    icon: "img/tray_icon.png",
  });
  var menu = new nw.Menu();
  // var AppName = new nw.MenuItem({
  //   type: "normal",
  //   label: "Memex Backup Helper",
  //   tooltip: "Click here to change the backup folder.",
  //   click: selectNewBackupFolder,
  // });
  var submenu = new nw.Menu();
  itemStartServer = new nw.MenuItem({
    type: "normal",
    label: "Start Server",
    tooltip: "Click here to start the memex backup server.",
    click: startServer,
    enabled: false,
  });
  itemStopServer = new nw.MenuItem({
    type: "normal",
    label: "Stop Server",
    tooltip: "Click here to stop the memex backup server.",
    click: stopServer,
    enabled: false,
  });
  submenu.append(itemStartServer);
  submenu.append(itemStopServer);
  itemServerStatus = new nw.MenuItem({
    type: "normal",
    iconIsTemplate: false,
    label: "no backup folder selected",
    submenu: submenu,
  });
  itemOpenBackup = new nw.MenuItem({
    type: "normal",
    label: "Open backup folder",
    tooltip: "Click here to open the backup folder.",
    click: openBackupFolder,
  });
  var itemChangeFolder = new nw.MenuItem({
    type: "normal",
    label: "Change backup folder",
    tooltip: "Click here to change the backup folder.",
    click: selectNewBackupFolder,
  });
  var itemCloseApp = new nw.MenuItem({
    type: "normal",
    label: "Quit",
    click: closeApp,
  });
  // menu.append(AppName);
  // menu.append(new nw.MenuItem({ type: "separator" }));
  // menu.append(itemServerStatus);
  menu.append(new nw.MenuItem({ type: "separator" }));
  menu.append(itemOpenBackup);
  menu.append(itemChangeFolder);
  menu.append(new nw.MenuItem({ type: "separator" }));
  menu.append(itemCloseApp);
  tray.menu = menu;

  if (!backupPath) {
    gui.Window.get().on("loaded", () => {
      updateBackupLocation();
    });
  }
}

async function closeApp() {
  stopServer();
  closeTray();
  nw.App.quit();
}

async function closeTray() {
  if (tray) {
    tray.remove();
    tray = null;
  }
}

async function loadBackupLocation() {
  if (fs.existsSync("./backup_location.txt")) {
    backupPath = fs.readFileSync("./backup_location.txt", "utf-8");
    return true;
  }
  return false;
}

async function updateBackupLocation() {
  await stopServer();
  if (await loadBackupLocation()) {
    itemOpenBackup.enabled = true;
    await startServer();
  } else {
    itemOpenBackup.enabled = false;
    await selectNewBackupFolder();
  }
}

async function closeFolderSelect() {
  gui.Window.get().hide();
}

async function selectNewBackupFolder() {
  return new Promise((res) => {
    gui.Window.get().show();
    document
      .getElementById("applyButton")
      .addEventListener("click", async (event) => {
        event.target.disabled = true;
        const path = document.getElementById("folderSelect").value;
        fs.writeFileSync("./backup_location.txt", path);
        closeFolderSelect();
        updateBackupLocation();
        res(path);
      });
    document
      .getElementById("cancelButton")
      .addEventListener("click", async () => {
        closeFolderSelect();
        res("");
      });
  });
}

async function openBackupFolder() {
  if (fs.existsSync(backupPath + "/backup")) {
    nw.Shell.openItem(backupPath + "/backup");
  } else {
    nw.Shell.openItem(backupPath);
  }
}

async function startServer() {
  console.log("start server");
  if (!server) {
    server = await new Promise((resolve, reject) => {
      let server = app.listen(port, (err) => {
        err ? reject(err) : resolve(server);
      });
    });
    itemStartServer.enabled = false;
    itemStopServer.enabled = true;
    itemServerStatus.label = "Server running";
    itemServerStatus.icon = "./img/active.png";
  }
}

async function stopServer() {
  if (server) {
    server.close();
    server = undefined;
    itemStopServer.enabled = false;
    itemStartServer.enabled = true;
    itemServerStatus.label = "Server not running";
    itemServerStatus.icon = "./img/inactive.png";
  }
}

main();
