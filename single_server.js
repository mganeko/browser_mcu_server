//
// Browser MCU sample server
//   https://github.com/mganeko/browser_mcu_server
//   browser_mcu_server is provided under MIT license
//
//   This sample is using https://github.com/mganeko/browser_mcu_core
//

'use strict';

const fs = require('fs');

let serverOptions = null;
let mcuOptions = null;
if (isFileExist('options.js')) {
  serverOptions = require('./options').serverOptions;
  mcuOptions = require('./options').mcuOptions;
  console.log('read options.js');
}
else if (isFileExist('options_default.js')) {
  serverOptions = require('./options_default').serverOptions;
  mcuOptions = require('./options_default').mcuOptions;
  console.log('read options_defalult.js');
}
else {
  console.error('NO options. Please set options.js or options_defalult.js');
  process.exit(1);
}

let sslOptions = {};
if (serverOptions.useHttps) {
  sslOptions.key = fs.readFileSync(serverOptions.httpsKeyFile).toString(),
  sslOptions.cert = fs.readFileSync(serverOptions.httpsCertFile).toString()
}

const childProcess = require('child_process');
let headless = null;

const http = require("http");
const https = require("https");
const WebSocketServer = require('ws').Server;
const express = require('express');

const app = express();
const webPort = serverOptions.listenPort;
app.use(express.static('public_single'));

let webServer = null;
if (serverOptions.useHttps) {
  // -- https ---
  webServer = https.createServer( sslOptions, app ).listen(webPort, function(){
    console.log('Web server start. https://' + serverOptions.hostName + ':' + webServer.address().port + '/');
  });
}
else {
  // --- http ---
  webServer = http.Server( app ).listen(webPort, function(){
    console.log('Web server start. http://' + serverOptions.hostName + ':' + webServer.address().port + '/');
  });
}
const wsServer = new WebSocketServer({ server: webServer });
console.log('websocket server start. port=' + webServer.address().port );

let clientIndex = 0;


// --- websocket server ---
function getId(ws) {
  if (ws.additionalId) {
    return ws.additionalId;
  }
  else {
    clientIndex++;
    ws.additionalId = 'member_' + clientIndex;
    return ws.additionalId;
  }
}

function getClientCount() {
  // NG:  return wsServer.clients.length;
  return wsServer.clients.size;
}

wsServer.on('connection', function connection(ws) {
  console.log('client connected. id=' + getId(ws) + '  , total clients=' + getClientCount());
  broadcast( { type: 'notify', text: 'new client connected. count=' + getClientCount() } );

  ws.on('close', function () {
    const fromId = getId(ws);
    console.log('client closed. id=' + fromId + '  , total clients=' + getClientCount());
    broadcast( { type: 'client_disconnect', from: fromId});
    broadcast( { type: 'notify', text: 'client closed. count=' + getClientCount() } );
  });
  ws.on('error', function(err) {
    console.error('ERROR:', err);
  });
  ws.on('message', function incoming(data) {
    const inMessage = JSON.parse(data);
    const fromId = getId(ws);
    if (! inMessage) {
      console.error('GOT INVALID data from:' + fromId);
      return;      
    }

    console.log('received id=%s type=%s',  fromId, inMessage.type);
    inMessage.from = fromId;
    const toId = inMessage.to;

    if (toId) {
      sendTo(toId, inMessage);
    }
    else {
      sendOthers(fromId, inMessage)
    }
  });

  sendback(ws, { type: 'welcome' });
});

function sendback(ws, message) {
  const str = JSON.stringify(message);
  ws.send(str);
}

function broadcast(message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    ws.send(str);
  });
};

function sendOthers(fromId, message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    if (getId(ws) === fromId) {
      // skip
      console.log('skip same id=' + fromId);
    }
    else {
      ws.send(str);
    }
  });
}

function sendTo(toId, message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    if (getId(ws) === toId) {
      // send message
      console.log('send message to id=' + toId);
      ws.send(str);
      return;
    }
  });
}

// --- file check ---
function isFileExist(path) {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    //console.log('File Exist path=' + path);
    return true;
  }
  catch (err) {
    if(err.code === 'ENOENT') {
      //console.log('File NOT Exist path=' + path);
      return false
    }
  }

  console.error('MUST NOT come here');
  return false;
}

// --- headless browser ---

function startHeadlessChrome() {
  let openURL = buildURL('');
  let mcuArgs = buildArgs(openURL);
  headless = childProcess.execFile(mcuOptions.headlessFullpath,
    //['--headless', '--disable-gpu', '--remote-debugging-port=9222', openURL],
    mcuArgs,
    (error, stdout, stderr) => {
      if (error) {
        //console.error('headless chrome ERROR:', error);
        console.error('headless chrome ERROR:');
      }
      else {
        console.log('headless　chrome STDOUT:');
        console.log(stdout);
      }
    }
  );
  console.log('-- start chrome --');
  console.log(' url=' + openURL);

  headless.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    headless = null;
  });
}

function buildURL(channel) {
  let protocol = 'http://';
  if (serverOptions.useHttps) {
    protocol = 'https://';
  }

  let url = protocol + serverOptions.hostName + ':' + serverOptions.listenPort + '/' + mcuOptions.headlessUrlSingle;
  console.log('mcu URL=' + url);
  return url;
}

/*
function buildArgs(url) {
  let args = mcuOptions.headlessArgs;
  args.push(url);
  //console.log(args);
  return args;
}
*/

function buildArgs(url) {
  let args = [].concat(mcuOptions.headlessArgs);
  args.push(url);
  console.log(args);
  return args;
}

function stopHeadlessChrome() {
  if (headless) {
    headless.kill('SIGKILL'); // OK
    console.log('---terminate headless chrome ----');
    headless = null;
  }
}

// --- start mcu ---
if (mcuOptions.autoStartHeadless) {
  console.log('---auto start headles browser as single room MCU ---');
  startHeadlessChrome();
}

