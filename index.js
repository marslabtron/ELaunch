const electron = require('electron');
const {
  app,
  Tray,
  Menu,
  BrowserWindow
} = electron;
const ipcMain = require('electron').ipcMain
const plugin = require('./plugins')
const config = require('./config')

let mainWindow;

function init() {
  const shouldQuit = makeSingleInstance()
  if (shouldQuit) return app.quit()
  app.dock.hide()
  app.on('ready', () => {
    createMainWindow()
    registShotcut()
    initTray()
  });
  // Quit when all mainWindows are closed.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darmainWin') {
      app.quit();
    }
  });
  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow();
    }
  });
  ipcMain.on('exec', (event, data) => {
    plugin.exec(data, event)
  })
  ipcMain.on('exec-item', (event, data) => {
    plugin.execItem(data, event)
  })
  ipcMain.on('window-resize', (event, data) => {
    let height = data.height || mainWindow.getContentSize()['height'];
    let width = data.width || mainWindow.getContentSize()['width'];
    if (!config.debug) {
      mainWindow.setContentSize(width, height, true);
    }
  })
  ipcMain.on('hide', () => {
    mainWindow.hide()
  })
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: config.debug ? 800 : config.width,
    height: 400,
    resizable: config.debug ? true : false,
    title: config.title,
    type: config.debug ? 'normal' : 'splash',
    frame: false,
    skipTaskbar: config.debug ? false : true,
    autoHideMenuBar: config.debug ? false : true,
    backgroundColor: 'alpha(opacity=0)',
    show: !process.argv.some((arg) => arg === '--hide'),
    transparent: true,
    alwaysOnTop: true,
    disableAutoHideCursor: true
  });

  if (!config.debug) {
    mainWindow.setContentSize(config.width, config.height, true);
  }

  mainWindow.loadURL(`file://${__dirname}/browser/search/index.html`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('blur', () => {
    mainWindow.hide()
  })
}

function toggleMainWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.restore();
    mainWindow.show()
    mainWindow.focus();
  }
}

function registShotcut() {
  let shotcut = config.shotcut && config.shotcut[process.platform] || config.shotcut.default
  shotcut = shotcut || 'Super+Space'
  const ret = electron.globalShortcut.register(shotcut, toggleMainWindow);

  if (!ret) {
    console.log('registration failed');
  }
}

let tray = null

function initTray() {
  tray = new Tray(__dirname+'/elaunch.iconset/icon_16x16@2x.png')
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Toggle ELaunch',
    click(item, focusedWindow) {
      toggleMainWindow()
    }
  }, {
    label: 'Preferences',
    click(item, focusedWindow) {
      require('electron').shell.openItem(require('os').homedir()+'/.ELaunch/config.js')
    }
  }, {
    label: 'exit',
    click(item, focusedWindow) {
      process.exit(0)
    }
  }]);
  tray.setToolTip('ELaunch is running.')
  tray.setContextMenu(contextMenu)
}

function makeSingleInstance() {
  return app.makeSingleInstance((commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

init()
