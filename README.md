# Browser MCU Server

* Browser MCU Server is Web/Signaling server for WebRTC MCU using a browser for video/audio processing
* Browser MCU Server is using [Browser MCU Core](https://github.com/mganeko/browser_mcu_core) library 
* Browser MCU Server is using node.js, express and ws
* Browser MCU Server is a part of Browser MCU Series
* --
* Browser MCU Server はブラウザの映像/音声処理を活用した、WebRTC用MCUのためのWeb/シグナリングサーバーです
* Browser MCU Server は[Browser MCU Core](https://github.com/mganeko/browser_mcu_core) ライブラリを利用しています
* Browser MCU Server は node.js, express, ws を利用しています
* Browser MCU Server は Browser MCU シリーズの一部です

## Confirmed Environment / 動作確認環境

* Server OS
  * Mac OS X 10.12.5
  * Ubuntu 16.04 LTS
* Web Browser
  * Chrome  58.0.3029.110 (64-bit) for MacOS X
  * Firefox 54.04 (64-bit) for MacOS X


## Usage / 利用方法

#### Preparation / 準備

```
git clone https://github.com/mganeko/browser_mcu_server.git
npm install
```

#### Start Server / サーバー開始

```
npm single_server.js
```

or 

```
npm start
```

#### Browser / ブラウザ

(1) MCU

* open http://localhost:3000/single_mcu.html with Chrome

(2) Client

* open http://localhost:3000/?roomname with Chrome/Firefox



### NOTE / 注意

* mixed video will not be updated when window/tab is hidden
  * In headless browser, this is not a restriction
* ウィンドウ/タブが完全に隠れていると、合成した映像が更新されません
  * ヘッドレスブラウザの場合は、画面が見えなくても問題ありません

## License / ライセンス

* Browser MCU Server is under the MIT license
* Browser MCU Server はMITランセンスで提供されます

## To Do

Server

- [x] setting for STUN/TURN ... please configure public_single/pc_config.js as you lile

