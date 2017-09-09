// member_peer.js
//  handling PeerConnections for MCU Members
//
//  Browser MCU Server/Service

// reduce invert dependence
//  DONE: sendSDP()
//  DONE: sendIceCandidate()
//  DONE: updateButtons()
//  DONE: logStream()
//  DONE: showState()
//  DONE: disconnect()

//  DONE: addRemoteVideo()
//  DONE: removeRemoteVideo()




const useTrickleICE = true;
let _localStream = null;
let _peerConnection = null;

let _addRemoteVideoFunc = null;
let _removeRemoteVideoFunc = null;
let _disconnectFunc = null; // function to handle ice disconnect event
let _updateUIFunc = null; // update UI callback

  // --- outer objenct and functions ---
  function setLocalStream(stream) {
    _localStream = stream;
  }

  function getLocalStream() {
    return _localStream
  }

  function setPeerConnection(peer) {
    _peerConnection = peer;
  }

  function getPeerConnection() {
    return _peerConnection;
  }

  function setRemoteVideoFunc(addFunc, removeFunc) {
    _addRemoteVideoFunc = addFunc;
    _removeRemoteVideoFunc = removeFunc;
  }

  //function setAddRemoteVideoFunc(func) {
  //  _addRemoteVideoFunc = func;
  //}

  //function setRemoveRemoteVideoFunc(func) {
  //  _removeRemoteVideoFunc = func;
  //}

  function setDisconnectFunc(func) {
    _disconnectFunc = func;
  }

  function setUpdateUIFunc(func) {
    _updateUIFunc = func;
  }

  // --- log state
  function logState(text) {
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

  // ----- band width -----
  // for chrome
  //audioBandwidth = 50; // kbps
  //videoBandwidth = 256; // kbps
  function setBandwidth(sdp, audioBandwidth, videoBandwidth) {
    let sdpNew = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
    sdpNew = sdpNew.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');

    //// -- trial for firefox, but not work between chrome - firefox --
    //let sdpNew = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n' + 'b=TIAS:' + audioBandwidth*1000 + '\r\n');
    //sdpNew = sdpNew.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n' + 'b=TIAS:' + videoBandwidth*1000 + '\r\n');
    //// -- trial for firefox, but not work between chrome - firefox --

    return sdpNew;
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection() {
    let pc_config = _PeerConnectionConfig;
    let peer = new RTCPeerConnection(pc_config);
    // --- on get remote stream ---
    if ('ontrack' in peer) {
      peer.ontrack = function(event) {
        console.log('-- peer.ontrack()');
        let stream = event.streams[0];
        _logStream('remotestream of ontrack()', stream);
        if ( (stream.getVideoTracks().length > 0) && (stream.getAudioTracks().length > 0) ) {
          _addRemoteVideoFunc(stream.id, stream);
        }
        
      };
    }
    else {
      peer.onaddstream = function(event) {
        console.log('-- peer.onaddstream()');
        let stream = event.stream;
        _logStream('remotestream of onaddstream()', stream);
        
        _addRemoteVideoFunc(stream.id, stream);
      };
    }
    // --- on get local ICE candidate
    peer.onicecandidate = function (evt) {
      if (evt.candidate) {
        console.log(evt.candidate);
        if (useTrickleICE) {
          // Trickle ICE の場合は、ICE candidateを相手に送る
          // send ICE candidate when using Trickle ICE
          sendIceCandidate(evt.candidate);
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
          sendSdp(peer.localDescription);
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
      logState('ice connection state=' + peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected') {
        console.log('-- disconnected, but wait for re-connect --');
      }
      else if (peer.iceConnectionState === 'failed') {
        console.log('-- failed, so give up --');
        if (_disconnectFunc) {
          _disconnectFunc();
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
      _removeRemoteVideoFunc(stream.id, stream);
    };
    
    
    // -- add local stream --
    let localStream = getLocalStream();
    if (localStream) {
      console.log('Adding local stream...');
      if ('addTrack' in peer) {
        console.log('use addTrack()');
        let tracks = localStream.getTracks();
        for (let track of tracks) {
          let sender = peer.addTrack(track, localStream);
        }
      }
      else {
        console.log('use addStream()');
        peer.addStream(localStream);
      }
    }
    else {
      console.warn('no local stream, but continue.');
    }
    return peer;
  }

  function setOffer(sessionDescription) {
    let peerConnection = getPeerConnection();

    if (peerConnection) {
      console.log('peerConnection alreay exist, reuse it');
    }
    else {
      console.log('prepare new PeerConnection');
      peerConnection = prepareNewConnection();
      setPeerConnection(peerConnection);
    }
    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
      console.log('setRemoteDescription(offer) succsess in promise');
      makeAnswer();
      if (_updateUIFunc) {
        _updateUIFunc();
      }
    }).catch(function(err) {
      console.error('setRemoteDescription(offer) ERROR: ', err);
    });
  }

  function setAnswer(sessionDescription) {
    let peerConnection = getPeerConnection();

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

  function makeOffer() {
    console.log('sending Offer. Creating session description...' );
    let peerConnection = getPeerConnection();

    if (peerConnection) {
      console.log('peerConnection alreay exist, reuse it');
    }
    else {
      console.log('prepare new PeerConnection');
      peerConnection = prepareNewConnection();
      setPeerConnection(peerConnection);
    }

    peerConnection.createOffer()
    .then(function (sessionDescription) {
      console.log('createOffer() succsess in promise');

      // -- limit bandwidth --
      const audioBand = 64; // kbps
      const videoBand = 512; // kbps
      let sdpLimit = setBandwidth(sessionDescription.sdp, audioBand, videoBand);
      sessionDescription.sdp = sdpLimit;

      return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
      console.log('setLocalDescription() succsess in promise');
      if (useTrickleICE) {
        // -- Trickle ICE の場合は、初期SDPを相手に送る --
        // send initial SDP when using Trickle ICE
        sendSdp(peerConnection.localDescription);
      }
      else {
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        // wait for ICE candidates for Vanilla ICE
        //sendSdp(peerConnection.localDescription);
      }
    }).catch(function(err) {
      console.error(err);
    });
  }

  function makeAnswer() {
    console.log('sending Answer. Creating session description...' );
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    
    peerConnection.createAnswer()
    .then(function (sessionDescription) {
      console.log('createAnswer() succsess in promise');

      // -- limit bandwidth --
      const audioBand = 64; // kbps
      const videoBand = 512; // kbps
      let sdpLimit = setBandwidth(sessionDescription.sdp, audioBand, videoBand);
      sessionDescription.sdp = sdpLimit;

      return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
      console.log('setLocalDescription() succsess in promise');
      if (useTrickleICE) {
        // -- Trickle ICE の場合は、初期SDPを相手に送る --
        // send initial SDP when using Trickle ICE
        sendSdp(peerConnection.localDescription);
      }
      else {
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        // wait for ICE candidates for Vanilla ICE
        //sendSdp(peerConnection.localDescription);
      }
    }).catch(function(err) {
      console.error(err);
    });
  }

  function addIceCandidate(candidate) {
    let peerConnection = getPeerConnection();
    
    if (peerConnection) {
      peerConnection.addIceCandidate(candidate);
    }
    else {
      console.error('PeerConnection not exist!');
      return;
    }
  }

  // ---- send signaling info ----
  let _sendJsonFunc = null;
  
  function setSendJsonFunc(func) {
    _sendJsonFunc = func;
  }

  function sendSdp(sessionDescription) {
    console.log('---sending sdp ---');
    const jsonSDP = sessionDescription.toJSON();
    console.log('sending to:' + peerPartnerId + '  SDP:', jsonSDP);

    //sendJson(jsonSDP);
    _sendJsonFunc(jsonSDP);
  }

  function sendIceCandidate(candidate) {
    console.log('---sending ICE candidate ---');
    const obj = { type: 'candidate', ice: candidate };
    //sendJson(obj);
    _sendJsonFunc(obj);
  }
