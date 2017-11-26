// member_peer.js
//  handling PeerConnections for MCU Members, with N to N
//
//  Browser MCU Server/Service

const useTrickleICE = true;
let _localStream = null;
//let _peerConnection = null;
let _Connections = [];

let _addRemoteVideoFunc = null;
let _removeRemoteVideoFunc = null;
let _disconnectFunc = null; // function to handle ice disconnect event
let _updateUIFunc = null; // update UI callback
let _videoBandwidth = 512; // kbps
let _audioBandwidth = 64;  // kpbs

  // --- outer object and functions ---
  function setLocalStream(stream) {
    _localStream = stream;
  }

  function getLocalStream() {
    return _localStream
  }

  //function setPeerConnection(peer) {
  //  _peerConnection = peer;
  //}

  //function getPeerConnection() {
  //  return _peerConnection;
  //}

  function setRemoteVideoFunc(addFunc, removeFunc) {
    _addRemoteVideoFunc = addFunc;
    _removeRemoteVideoFunc = removeFunc;
  }

  function setDisconnectFunc(func) {
    _disconnectFunc = func;
  }

  function setUpdateUIFunc(func) {
    _updateUIFunc = func;
  }

  function setBandwidth(videoBw, audioBw) {
    _videoBandwidth = videoBw;
    _audioBandwidth = audioBw;
  }

  // --- log state
  function _logState(text) {
    console.log(text);
  }

  function _logStream(msg, stream) {
    console.log(msg + ': id=' + stream.id);

    let videoTracks = stream.getVideoTracks();
    if (videoTracks) {
    console.log('videoTracks.length=' + videoTracks.length);
    videoTracks.forEach(function(track) {
      console.log(' track.id=' + track.id);
    });
    }
    
    let audioTracks = stream.getAudioTracks();
    if (audioTracks) {
    console.log('audioTracks.length=' + audioTracks.length);
    audioTracks.forEach(function(track) {
      console.log(' track.id=' + track.id);
    });
    }
  }

  // -- mcu connection management ---
  // 
  //

  function getConnection(id) {
    let peer = _Connections[id];
    if (! peer) {
      console.log('Peer not exist for id:' + id);
    }
    return peer;
  }

  function isConnected(id) {
    const peer = _Connections[id];
    if (peer) {
      return true;
    }
    else {
      return false;
    }
  }

  function addConnection(id, peer) {
    if (isConnected(id)) {
      console.error('ALREADY CONNECTED to id:' + id);
      return;
    }

    _Connections[id] = peer;
  }

  function removeConnection(id) {
    if (! isConnected(id)) {
      console.warn('NOT CONNECTED to id:' + id);
      return;
    }

    let peer = _Connections[id];
    peer.close();
    peer = null;
    delete _Connections[id];
  }

  function getRemoteStream(id) {
    let peer = getConnection(id);
    if (peer) {
      let stream = peer.getRemoteStreams()[0];
      return stream;
    }
    else {
      console.warn('NOT CONNECTED to id:' + id);
      return null;
    }
  }

  function closeAllConnections() {
    for (let id in _Connections) {
      let peer = _Connections[id];
      peer.close();
      peer = null;
      delete _Connections[id];
    }
  }

  function getConnectionCount() {
    //let l1 = _Connections.length;
    //let l2 = Object.keys(_Connections).length;
    //console.log('getConnectionCount() l1=' + l1 + '  l2=' + l2 );
    return  Object.keys(_Connections).length;
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection(id) {
    let pc_config = _PeerConnectionConfig;
    let peer = new RTCPeerConnection(pc_config);
    // --- on get remote stream ---
    if ('onaddstream' in peer) {
      peer.onaddstream = function(event) {
        console.log('-- peer.onaddstream()');
        let stream = event.stream;
        _logStream('remotestream of onaddstream()', stream);
        
        if (_addRemoteVideoFunc) {
          _addRemoteVideoFunc(stream.id, stream);
        }
        else {
          console.warn('NO Func to handle onaddstream()');
        }
      };
    }
    else if ('ontrack' in peer) {
      peer.ontrack = function(event) {
        console.log('-- peer.ontrack()');
        let stream = event.streams[0];
        _logStream('remotestream of ontrack()', stream);
        if ( (stream.getVideoTracks().length > 0) && (stream.getAudioTracks().length > 0) ) {
          if (_addRemoteVideoFunc) {
            _addRemoteVideoFunc(stream.id, stream);
          }
          else {
            console.warn('NO Func to handle ontrack()');
          }
        }
      };
    }
    else {
      console.error('NOT remoteStream handler');
    }
    // --- on get local ICE candidate
    peer.onicecandidate = function (evt) {
      if (evt.candidate) {
        console.log(evt.candidate);
        if (useTrickleICE) {
          // Trickle ICE の場合は、ICE candidateを相手に送る
          // send ICE candidate when using Trickle ICE
          sendIceCandidate(id, evt.candidate);
        }
        else {
          // Vanilla ICE の場合には、何もしない
          // do NOTHING for Vanilla ICE
        }
      } else {
        console.log('empty ice event');
        if (useTrickleICE) {
          // Trickle ICE の場合は、何もしない
          // do NOTHING for Trickle ICE
        }
        else {
          // Vanilla ICE の場合には、ICE candidateを含んだSDPを相手に送る
          // send SDP with ICE candidtes when using Vanilla ICE
          sendSdp(id, peer.localDescription);
        }
      }
    };
    // --- when need to exchange SDP ---
    peer.onnegotiationneeded = function(evt) {
      console.log('-- onnegotiationneeded() ---');
      console.warn('--- IGNORE ---');
    };
    // --- other events ----
    peer.onicecandidateerror = function (evt) {
      console.error('ICE candidate ERROR:', evt);
    };
    peer.onsignalingstatechange = function() {
      console.log('== signaling state=' + peer.signalingState);
    };
    peer.oniceconnectionstatechange = function() {
      console.log('== ice connection state=' + peer.iceConnectionState);
      //showState('ice connection state=' + peer.iceConnectionState);
      _logState('ice connection state=' + peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected') {
        console.log('-- disconnected, but wait for re-connect --');
      }
      else if (peer.iceConnectionState === 'failed') {
        console.log('-- failed, so give up --');
        if (_disconnectFunc) {
          _disconnectFunc(id);
        }
      }
    };
    peer.onicegatheringstatechange = function() {
      console.log('==***== ice gathering state=' + peer.iceGatheringState);
    };
    
    peer.onconnectionstatechange = function() {
      console.log('==***== connection state=' + peer.connectionState);
    };
    peer.onremovestream = function(event) {
      console.log('-- peer.onremovestream()');
      let stream = event.stream;
      if (_removeRemoteVideoFunc) {
        _removeRemoteVideoFunc(stream.id, stream);
      }
      else {
        console.warn('NO Func to handle onremovestream()');
      }
    };
    
    
    // -- add local stream --
    let localStream = getLocalStream();
    if (localStream) {
      console.log('Adding local stream...');
      if ('addStream' in peer) {
        console.log('use addStream()');
        peer.addStream(localStream);
      }
      else if ('addTrack' in peer) {
        console.log('use addTrack()');
        let tracks = localStream.getTracks();
        for (let track of tracks) {
          let sender = peer.addTrack(track, localStream);
        }
      }
      else {
        console.error('NO method to add localStream');
      }
    }
    else {
      console.warn('no local stream, but continue.');
    }
    return peer;
  }

  function setOffer(id, sessionDescription) {
    let peerConnection = getConnection(id);

    if (peerConnection) {
      console.log('peerConnection alreay exist, reuse it');
    }
    else {
      console.log('prepare new PeerConnection');
      peerConnection = prepareNewConnection(id);
      //setPeerConnection(peerConnection);
      addConnection(id, peerConnection);
    }
    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
      console.log('setRemoteDescription(offer) succsess in promise');
      makeAnswer(id);
      if (_updateUIFunc) {
        _updateUIFunc();
      }
    }).catch(function(err) {
      console.error('setRemoteDescription(offer) ERROR: ', err);
    });
  }

  function setAnswer(id, sessionDescription) {
    let peerConnection = getConnection(id);

    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }

    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
      console.log('setRemoteDescription(offer) succsess in promise');
      if (_updateUIFunc) {
        _updateUIFunc();
      }
    }).catch(function(err) {
      console.error('setRemoteDescription(offer) ERROR: ', err);
    });
  }

  function makeOffer(id) {
    console.log('sending Offer. Creating session description...' );
    let peerConnection = getConnection(id);

    if (peerConnection) {
      console.log('peerConnection alreay exist, reuse it');
    }
    else {
      console.log('prepare new PeerConnection');
      peerConnection = prepareNewConnection(id);
      //setPeerConnection(peerConnection);
      addConnection(id, peerConnection);
    }

    // for receive only,  send only too
    let options = {};
    if (isSendOnly()) {
      options = { offerToReceiveAudio: false, offerToReceiveVideo: false };
    }
    else if (isRecvOnly()) {
      options = { offerToReceiveAudio: true, offerToReceiveVideo: true };

      // -- for safari --
      if ('addTransceiver' in peerConnection) {
        console.log('-- use addTransceiver() for recvonly --');
        peerConnection.addTransceiver('video').setDirection('recvonly');
        peerConnection.addTransceiver('audio').setDirection('recvonly');
      }
    }

    peerConnection.createOffer(options)
    .then(function (sessionDescription) {
      console.log('createOffer() succsess in promise');

      // -- limit bandwidth --
      const audioBand = _audioBandwidth; // kbps
      const videoBand = _videoBandwidth; // kbps
      let sdpLimit = _setBandwidthInSDP(sessionDescription.sdp, audioBand, videoBand);
      sessionDescription.sdp = sdpLimit;

      return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
      console.log('setLocalDescription() succsess in promise');
      if (useTrickleICE) {
        // -- Trickle ICE の場合は、初期SDPを相手に送る --
        // send initial SDP when using Trickle ICE
        sendSdp(id, peerConnection.localDescription);
      }
      else {
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        // wait for ICE candidates for Vanilla ICE
        //sendSdp(id, peerConnection.localDescription);
      }
    }).catch(function(err) {
      console.error(err);
    });
  }

  function makeAnswer(id) {
    console.log('sending Answer. Creating session description...' );
    let peerConnection = getConnection(id);
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }

    let options = {};
    if (! isRecvOnly()) {
      //options = { offerToReceiveAudio: true, offerToReceiveVideo: true }

      if ('addTransceiver' in peerConnection) {
        console.log('-- use addTransceiver() for recvonly --');
        peerConnection.addTransceiver('video').setDirection('recvonly');
        peerConnection.addTransceiver('audio').setDirection('recvonly');
      }
    }

    peerConnection.createAnswer()
    .then(function (sessionDescription) {
      console.log('createAnswer() succsess in promise');

      // -- limit bandwidth --
      const audioBand = _audioBandwidth; // kbps
      const videoBand = _videoBandwidth; // kbps
      let sdpLimit = _setBandwidthInSDP(sessionDescription.sdp, audioBand, videoBand);
      sessionDescription.sdp = sdpLimit;

      return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
      console.log('setLocalDescription() succsess in promise');
      if (useTrickleICE) {
        // -- Trickle ICE の場合は、初期SDPを相手に送る --
        // send initial SDP when using Trickle ICE
        sendSdp(id, peerConnection.localDescription);
      }
      else {
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        // wait for ICE candidates for Vanilla ICE
        //sendSdp(id, peerConnection.localDescription);
      }
    }).catch(function(err) {
      console.error(err);
    });
  }

  function addIceCandidate(id, candidate) {
    let peerConnection = getConnection(id);
    
    if (peerConnection) {
      peerConnection.addIceCandidate(candidate);
    }
    else {
      console.error('PeerConnection not exist!');
      return;
    }
  }

  function isSendOnly() {
    if (! _addRemoteVideoFunc) {
      return true;
    }
    else {
      return false;
    }
  }

  function isRecvOnly() {
    if (! getLocalStream()) {
      return true;
    }
    else {
      return false;
    }
  }

  // ----- band width -----
  // for chrome
  //audioBandwidth = 50; // kbps
  //videoBandwidth = 256; // kbps
  function _setBandwidthInSDP(sdp, audioBandwidth, videoBandwidth) {
    let sdpNew = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
    sdpNew = sdpNew.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');

    //// -- trial for firefox, but not work between chrome - firefox --
    //let sdpNew = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n' + 'b=TIAS:' + audioBandwidth*1000 + '\r\n');
    //sdpNew = sdpNew.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n' + 'b=TIAS:' + videoBandwidth*1000 + '\r\n');
    //// -- trial for firefox, but not work between chrome - firefox --

    return sdpNew;
  }

  // ---- send signaling info ----
  let _sendJsonFunc = null;
  
  function setSendJsonFunc(func) {
    _sendJsonFunc = func;
  }

  function sendSdp(id, sessionDescription) {
    console.log('---sending sdp ---');
    const jsonSDP = sessionDescription.toJSON();
    console.log('sending to:' + id + '  SDP:', jsonSDP);

    //sendJson(jsonSDP);
    _sendJsonFunc(id, jsonSDP);
  }

  function sendIceCandidate(id, candidate) {
    console.log('---sending ICE candidate ---');
    const obj = { type: 'candidate', ice: candidate };
    //sendJson(obj);
    _sendJsonFunc(id, obj);
  }
