'use strict';

module.exports =
{
  serverOptions: {
    listenPort : 3000,
    hostName : 'localhost',
    useHttps : false,
    httpsKeyFile: 'cert/server.key',
    httpsCertFile: 'cert/server.crt',
    dummyTail : false
  },
  mcuOptions : {
    autoStartHeadless : true,
    headlessFullpath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome', // for MacOS X
    //headlessFullpath: '/usr/bin/chromium-browser', // for ubuntu + chromium
    //headlessFullpath: '/usr/bin/google-chrome-stable', // for ubuntu + chrome

    headlessArgs: ['--headless',  '--disable-gpu',  '--remote-debugging-port=9222'], // With Debug port
    //headlessArgs: ['--disable-gpu',  '--remote-debugging-port=9222'], // NOT headless

    headlessUrlSingle: 'single_mcu.html',

    // NOT Supported yet :: maxUserInRoom: 4,
    dummyTail : false
  }
}
