# Browser MCU Server

* Browser MCU Server is Web/Signaling server for WebRTC MCU using a browser for video/audio processing
* Browser MCU Server is using [Browser MCU Core](https://github.com/mganeko/browser_mcu_core) library 
* Browser MCU Server is simple example of multi participants meeting with single room
* Browser MCU Server is using node.js, express and ws
* Browser MCU Server is a part of Browser MCU Series
* --
* Browser MCU Server はブラウザの映像/音声処理を活用した、WebRTC用MCUのためのWeb/シグナリングサーバーです
* Browser MCU Server は[Browser MCU Core](https://github.com/mganeko/browser_mcu_core) ライブラリを利用しています
* Browser MCU Server は複数参加者、1ルームの会議のサンプルです
* Browser MCU Server は node.js, express, ws を利用しています
* Browser MCU Server は Browser MCU シリーズの一部です

## Confirmed Environment / 動作確認環境

* Server OS
  * Mac OS X 10.12.5
  * Ubuntu 16.04 LTS
* Web Browser
  * Chrome  58.0.3029.110 (64-bit) for MacOS X
  * Firefox 54.04 (64-bit) for MacOS X


## Preparation / 準備

#### Install / インストール

```
git clone --recursive https://github.com/mganeko/browser_mcu_server.git
npm install
```

#### Configuration / 設定

Copy default options and edit it / デフォルトのオプション指定をコピーして、編集してください

```
cp options_default.js options.js
vi options.js
```

* serverOptions
  * listenPort ... port for http(s) and ws(s)
  * hostName ... hostname  (ex) server.domain.com
  * useHttps ... flag to use HTTPS (false / true)
  * httpsKeyFile ... private key file if using HTTPS
  * httpsCertFile ... certification file if using HTTPS
* mcuOptions
  * autoStartHeadless ... flag to start MCU as headless browser (true / false)
  * headlessFullpath ... path to Chrome (v59 or later)

#### STUN, TURN settings / STUN, TURN の設定

* edit public_single/js/pc_config.js for SUTN/TURN servers
* public_single/js/pc_config.js を編集してSUTN/TURNサバーの情報を指定してください

## Usage / 利用方法

#### Start Server / サーバー開始

```
node single_server.js
```

or 

```
npm start
```

#### Browser / ブラウザ

(1) MCU

Auto mode { autoStartHeadless : true }
* Browser MCU process will be started autoatically
* オートモードの場合、ブラウザーMCUは自動で起動されます

Manual mode { autoStartHeadless : false }
* open http://localhost:3000/single_mcu.html with Chrome in new window
* 手動モードの場合、Chromeブラウザの新しいウィンドウで http://localhost:3000/single_mcu.html を開いてください

(2) Client

* open http://localhost:3000/ with Chrome/Firefox in different window from MCU
* click [Start Video] button to access Camera/Microphone
* click [Connect] button to connect to MCU, and join the meeting
* click [Disconnect] button to leave the meeting
* click [Stop Video] button to stop Camera/Microphone
* --
* Chrome/Firefoxブラウザで、http://localhost:3000/ を開きます。このとき MCUとは別のウィンドウを使ってください
* [Start Video]ボタンをクリックし、カメラ/マイクを取得します
* [Connect]ボタンをクリックすると、MCUに接続し会議に参加できます
* [Disconnect]ボタンをクリックすると、会議から退出します
* [Stop Video]ボタンをクリックすると、カメラ/マイクを停止します


#### NOTE / 注意

* mixed video will not be updated when window/tab is hidden
  * In headless browser, this is not a restriction
* MCUのウィンドウ/タブが完全に隠れていると、合成した映像が更新されません
  * ヘッドレスブラウザの場合は、画面が見えなくても問題ありません

## License / ライセンス

* Browser MCU Server is under the MIT license
* Browser MCU Server はMITランセンスで提供されます

## To Do

Server

- [x] setting for STUN/TURN ... please configure public_single/pc_config.js as you lile

