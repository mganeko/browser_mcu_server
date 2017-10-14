'use strict';

module.exports =
{
  serverOptions: {
    // --- port and host name ---
    listenPort : 3000,  // for http(s) and ws(s)
    hostName : 'localhost', // ex) server.domain.com

    // --- for using HTTPS ---
    useHttps : false,
    httpsKeyFile: 'cert/server.key',
    httpsCertFile: 'cert/server.crt',

    dummyTail : false
  },
  
  mcuOptions : {
    // -- auto start switch for (headless) Browser MCU --
    //   true:  server process will start browser
    //   false: please start Browser MCU manually
    autoStartHeadless : true,

    // ---- auto start conditions ----
    headlessFullpath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome', // for MacOS X
    //headlessFullpath: '/usr/bin/chromium-browser', // for ubuntu + chromium
    //headlessFullpath: '/usr/bin/google-chrome-stable', // for ubuntu + chrome

    //headlessArgs: ['--headless',  '--disable-gpu',  '--remote-debugging-port=9222'], // With Debug port, for Chrome 60
    headlessArgs: ['--headless',  '--remote-debugging-port=9222'], // With Debug port, for Chrome 61
    //headlessArgs: ['--disable-gpu',  '--remote-debugging-port=9222'], // NOT headless

    headlessUrlSingle: 'single_mcu.html',

    // NOT Supported yet :: maxUserInRoom: 4,
    dummyTail : false
  }
}
