// to initialize webrtc handshake
firebase.initializeApp({
  apiKey: "AIzaSyA3eaighKOaFMrwRpofG57asPa0Lbbqj-I",
  authDomain: "webrtc-unity.firebaseapp.com",
  projectId: "webrtc-unity",
  storageBucket: "webrtc-unity.appspot.com",
  messagingSenderId: "303811586872",
  appId: "1:303811586872:web:cccd91ba22ee308969afcd",
  measurementId: "G-PSD75Q1D4W",
});

// store player info
const playerInfo = { isLocal: true, isConnected: false, local: {}, remote: {} };

// send methods
let localToRemote;
let remoteToLocal;

// get channel from url example: localhost:8000/?myChannel007
const channel = window.location.search.split("?").pop().toString() || null;

// check if channel exists
if (channel) {
  firebase
    .firestore()
    .collection("channels")
    .doc(channel)
    .get()
    .then((doc) => {
      // if no data then start local connection
      if (!doc.data() || doc.data().answer) {
        initLocalConnection();
      } else {
        initRemoteConnection();
      }
    });
} else {
  // reload page with channel
  window.location.search += `?${Math.floor(Math.random() * 9999)}`;
}

function initLocalConnection() {
  console.log("initializing local connection");
  playerInfo.isLocal = true;
  const lc = new RTCPeerConnection();
  const dc = lc.createDataChannel(channel);

  // local channel events
  dc.onopen = (e) => {
    // used in sendLocalPlayerInfo()
    localToRemote = dc;
    console.log("local is connected");
    playerInfo.isConnected = true;
    firebase.firestore().collection("channels").doc(channel).delete();
  };
  dc.onmessage = (msg) => {
    console.log("recieving from remote to local: " + msg.data);
    playerInfo.remote = msg.data;
  };
  dc.onclose = () => {
    playerInfo.isConnected = false;
    firebase.firestore().collection("channels").doc(channel).delete();
  };

  // create offer then set local
  lc.createOffer().then((offer) => lc.setLocalDescription(offer));

  // save offer to firebase
  lc.onicecandidate = (e) =>
    firebase
      .firestore()
      .collection("channels")
      .doc(channel)
      .set({ offer: JSON.stringify(lc.localDescription) });

  // listen for remote to save answer
  firebase
    .firestore()
    .collection("channels")
    .doc(channel)
    .onSnapshot((doc) => {
      // if answer is empty, set answer
      if (doc.data() && doc.data().answer) {
        lc.setRemoteDescription(JSON.parse(doc.data().answer));
      }
    });
}

function initRemoteConnection() {
  console.log("initializing remote connection");
  playerInfo.isLocal = false;
  const rc = new RTCPeerConnection();

  // remote channel events
  rc.ondatachannel = (e) => {
    remoteToLocal = e.channel;
    e.channel.onopen = () => {
      playerInfo.isConnected = true;
      console.log("remote is connected");
    };
    e.channel.onmessage = (msg) => {
      console.log("recieving from local to remote: " + msg.data);
      playerInfo.local = msg.data;
    };
    e.channel.onclose = () => {
      playerInfo.isConnected = false;
      firebase.firestore().collection("channels").doc(channel).delete();
    };
  };

  // get saved offer from firebase
  firebase
    .firestore()
    .collection("channels")
    .doc(channel)
    .get()
    .then((doc) => JSON.parse(doc.data().offer))
    .then((offer) => {
      // set remote
      rc.setRemoteDescription(offer);
      // create answer
      rc.createAnswer().then((answer) => {
        // set answer
        rc.setLocalDescription(answer);
        // save answer
        firebase
          .firestore()
          .collection("channels")
          .doc(channel)
          .update({ answer: JSON.stringify(answer) });
      });
    });
}

// from unity jslib
function isPlayerConnected() {
  return playerInfo.isConnected;
}

// from unity jslib
function isPlayerLocal() {
  return playerInfo.isLocal;
}

// from unity jslib
function getLocalPlayerInfo() {
  return playerInfo.local;
}

// from unity jslib
function getRemotePlayerInfo() {
  return playerInfo.remote;
}

// from unity jslib
function sendLocalToRemote(playerInfo) {
  if (isPlayerConnected()) {
    console.log("sending from local to remote: " + playerInfo);
    localToRemote.send(playerInfo);
  }
}

// from unity jslib
function sendRemoteToLocal(playerInfo) {
  if (isPlayerConnected()) {
    console.log("sending from remote to local: " + playerInfo);
    remoteToLocal.send(playerInfo);
  }
}
