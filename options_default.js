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
    headlessArgs: ['--headless',  '--disable-gpu',  '--remote-debugging-port=9222'], // With Debug port
    //headlessArgs: ['--disable-gpu',  '--remote-debugging-port=9222'], // Without Debug prot
    headlessUrlSingle: 'single_mcu.html',
    headlessUrlMulti: 'multi_mcu.html',
    // NOT Supported yet :: maxUserInRoom: 4,
    // NOT Supported yet :: maxRooms: 2
    dummyTail : false
  }
}
