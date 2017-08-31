// mcu_peer.js
//  handling PeerConnections for MCU
//
//  Browser MCU Server/Service

const useTrickleICE = true;
let Connections = [];

  // -- mcu connection management ---
  // 
  //

  function getConnection(id) {
    let peer = Connections[id];
    if (! peer) {
      console.warn('Peer not exist for id:' + id);
    }
    return peer;
  }

  function isConnected(id) {
    const peer = Connections[id];
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

    Connections[id] = peer;
  }

  function removeConection(id) {
    if (! isConnected(id)) {
      console.warn('NOT CONNECTED to id:' + id);
      return;
    }

    let peer = Connections[id];
    peer.close();
    peer = null;
    delete Connections[id];
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
    for (let id in Connections) {
      let peer = Connections[id];
      peer.close();
      peer = null;
      delete Connections[id];
    }
  }

  function getConnectionCount() {
    return  Object.keys(Connections).length;
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection(id) {
    //let pc_config = {"iceServers":[]};
    let pc_config = _PeerConnectionConfig;
    let peer = new RTCPeerConnection(pc_config);
    // --- on get remote stream ---
    if ('ontrack' in peer) {
      peer.ontrack = function(event) {
        console.log('-- peer.ontrack()');
        let stream = event.streams[0];
        logStream('remotestream of ontrack()', stream);
        if (event.track.kind === "video") {
          mcu.addRemoteVideo(stream);
        }
        else if (event.track.kind === "audio") {
          mcu.addRemoteAudioMinusOne(id, stream);
        }
        else {
          console.warn('UNKNOWN track kind:' + event.track.kind);
        }
      };
    }
    else {
      peer.onaddstream = function(event) {
        console.log('-- peer.onaddstream()');
        let stream = event.stream;
        logStream('remotestream of onaddstream()', stream);
        
        if (stream.getVideoTracks().length > 0) {
          console.log('adding remote video');
          mcu.addRemoteVideo(stream);
        }
        if (stream.getAudioTracks().length > 0) {
          mcu.addRemoteAudioMinusOne(id, stream);
          console.log('adding remote audio minus-one');
        }
      };
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
      console.warn('--- NOT SUPPORTED YET, IGNORE ---');
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
      showState('ice connection state=' + peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected') {
        console.log('-- disconnected, but wait for re-connect --');
      }
      else if (peer.iceConnectionState === 'failed') {
        console.log('-- failed, so give up --');

        console.log('dissconect only this peer id:' + id);
        dissconnectOne(id);
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
      removeRemoteVideo(stream.id, stream);

      if (stream.getVideoTracks().length > 0) {
        console.log('removing remote video');
        mcu.removeRemoteVideo(stream);
      }
      if (stream.getAudioTracks().length > 0) {
        mcu.removeRemoteAudioMinusOne(id, stream);
        console.log('removing remote audio minus-one');
      }
    };

    // -- start mix, if this is first connection ---
    if (getConnectionCount() === 0) {
      console.log('--- start mix ----');
      mcu.startMix();
    }

    // -- add mixed stream with minus one audio --
    let stream = mcu.prepareMinusOneStream(id);
    if (stream) {
      console.log('Adding mix stream...');
      if ('addTrack' in peer) {
        console.log('use addTrack()');
        let tracks = stream.getTracks();
        for (let track of tracks) {
          let sender = peer.addTrack(track, stream);
        }
      }
      else {
        console.log('use addStream()');
        peer.addStream(stream);
      }
    }
    else {
      console.error('NO mix stream, but continue.');
    }

    addConnection(id, peer);
    updateButtons();
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
    }
    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
      console.log('setRemoteDescription(offer) succsess in promise');
      makeAnswer(id);
    }).catch(function(err) {
      console.error('setRemoteDescription(offer) ERROR: ', err);
    });
  }

  function makeAnswer(id) {
    console.log('sending Answer. Creating session description...' );
    let peerConnection = getConnection(id);
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
        sendSdp(id, peerConnection.localDescription);
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

  // ---- send signaling info ----
  let _sendJsonFunc = null;
  
  function setSendJsonFunc(func) {
    _sendJsonFunc = func;
  }

  function sendSdp(id, sessionDescription) {
    console.log('---sending sdp ---');
    const jsonSDP = sessionDescription.toJSON();
    console.log('sending to:' + id + '  SDP:', jsonSDP);

    //sendJson(id, jsonSDP);
    _sendJsonFunc(id, jsonSDP);
  }

  function sendIceCandidate(id, candidate) {
    console.log('---sending ICE candidate ---');
    const obj = { type: 'candidate', ice: candidate };
    //sendJson(id, obj);
    _sendJsonFunc(id, obj);
  }
