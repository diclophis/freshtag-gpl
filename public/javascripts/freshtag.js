// All code

var tokboxExceptionHandler = function(event) {
  console.log("Exception: " + event.code + "::" + event.message);
  console.log(event, this);
  alert(event.message);
};

var createGravatarUrl = function() {
  if (allCookies.hasItem("gravatar")) {
  } else {
    allCookies.setItem("gravatar", Math.random());
  }

  var gravatar = allCookies.getItem("gravatar");

  return "http://www.gravatar.com/avatar/" + (gravatar.replace(".", "")) + "?d=wavatar";
};

var createTrendingLinks = function() {
  var trendingLinks = document.getElementById("trends").getElementsByTagName("a");

  setInterval(function() {
    for (var i=1; i<trendingLinks.length; i++) {
      var a = trendingLinks[i];
      a.parentNode.className = "hidden";
    }
    for (var i=0; i<8; i++) {
      var lr = (Math.random() * (trendingLinks.length));
      var le = trendingLinks[parseInt(lr)].parentNode;
      le.className = "show";
    }
  }, 30 * 1000);

  for (var i=0; i<trendingLinks.length; i++) {
    var a = trendingLinks[i];
    var rel = a.getAttribute("data-hashtag");
    a.href = hashTagUrl(rel);
    a.innerHTML = convertTextToHashTag(rel);
    if (i > 10) {
      a.parentNode.className = "hidden";
    }
  }
};

var onChuteMediaChooserChoose = function(urls, data) {
  var message = createMessage(this.publisher, this.gravatarUrl);
  message.chuteUrls = urls;
  pushMessage.apply(this, [message]);
};

var onChatMediaButtonClick = function(e) {
  e.preventDefault();
  Chute.MediaChooser.choose(onChuteMediaChooserChoose.bind(this));
  return false;
};

var onChatFormSubmit = function(e) {
  e.preventDefault();
  var message = createMessage(this.publisher, this.gravatarUrl);
  message.body = this.chatInput.value;
  pushMessage.apply(this, [message]);
  return false;
};

var getSession = function(webrtc, gotSessionFunc) {
  var req = new XMLHttpRequest();
  req.open("POST", "/api/session?webrtc=" + webrtc, true);
  req.onreadystatechange = function(e) {
    if (this.readyState == 4) {
      gotSessionFunc(req.responseText);
    }
  };
  req.send();
};

var onSessionGot = function(newSession) {
  this.sessionDataRef.set(newSession);
};

var onSessionValue = function(snapshot) {
  this.foundSession = snapshot.val();
  if (this.foundSession != null) {
    getToken(this.foundSession, loadTokBox.bind(this));
  } else {
    // you got the lock
    getSession(this.webrtc, onSessionGot.bind(this));
  }
};

var onFreshtagFormSubmit = function(e) {
  e.preventDefault();

  var hash = convertTextToHashTag(this.freshtagInput.value);

  if (hash.length == 0) {
    return false;
  }

  window.history.pushState(null, null, hashTagUrl(hash));

  connectToHashTag.apply(this, [hash]);

  return false;
};

var connectToHashTag = function(hash) {
  this.freshtagInput.value = hash;
  this.freshtagForm.onsubmit = function(e) {
    var newHash = this.freshtagInput.value;
    this.freshtagForm.reset();
    e.preventDefault();
    window.location = hashTagUrl(newHash);
    return false;
  }.bind(this);
  var namearr = hash.split("#"); // #topic -> ['', topic']
  var topic = namearr[namearr.length - 1]; // get last element from namearr
  //TODO: this is going to break sometime, so fix it later
  fb.realtime.BrowserPollConnection.isAvailable = function() { return false; };
  //Firebase.enableLogging(true);
  if (this.webrtc) {
    topic += "-webrtc";
  }
  this.chatDataRef = new Firebase('http://freshtag-dev.firebaseIO.com/brickapp/freshtag/chat/' + topic);
  this.chatDataRef.limit(3).on('child_added', onChatMessageChildAdded.bind(this));
  this.sessionDataRef = new Firebase('http://freshtag-dev.firebaseio.com/brickapp/freshtag/session/' + topic);
  this.sessionDataRef.on("value", onSessionValue.bind(this));
  this.chatInput.focus();
  document.body.className += " connected";
};

var createMessage = function(publisher, gravatarUrl) {
  var imgData = (publisher != null) ? publisher.getImgData() : null;
  var message = {
    imgData: imgData,
    imgUrl: gravatarUrl,
    body: null,
    chutUrls: null
  };
  return message;
};

var onPushMessage = function() {
  this.chatInput.value = "";
  this.chatInput.disabled = false;
  this.chatButton.disabled = false;
  this.chatInput.focus();
};

var pushMessage = function(message) {
  if (this.chatDataRef != null) {
    this.chatInput.disabled = true;
    this.chatButton.disabled = true;
    this.chatDataRef.push(message, onPushMessage.bind(this));
  } else {
    throw "this.chatDataRef is invalid";
  }
};

var createMessageLi = function(message) {
  var li = document.createElement("li");
  if (message.imgData != null && message.imgData.length > 0) {
    var img = document.createElement("img");
    img.setAttribute("src", "data:image/png;base64," + (message.imgData));
    li.appendChild(img);
  } else if (message.imgUrl != null && message.imgUrl.length > 0) {
    var img = document.createElement("img");
    img.setAttribute("src", (message.imgUrl));
    li.appendChild(img);
  }
  if (message.body != null) {
    var msgSpan = document.createElement("p");
    var strippedBody = htmlEntities(message.body);
    var hashLoc = 0;
    var hashes = 0;
    while(hashes++ < 10) {
      hashLoc = strippedBody.indexOf("#", hashLoc);
      var beforeHash = null;
      beforeHash = strippedBody.charAt(hashLoc - 1);
      if (hashLoc != 0 &&  beforeHash != ' ') {
        if (beforeHash == '&') {
          hashLoc++;
          continue;
        }
        break;
      }
      var endOfHashLoc = strippedBody.indexOf(' ', hashLoc);
      if (endOfHashLoc == -1) {
        endOfHashLoc = strippedBody.length;
      }
      var text = strippedBody.substring(hashLoc + 1, endOfHashLoc);
      var left = strippedBody.substring(0, hashLoc);
      var right = strippedBody.substring(endOfHashLoc, strippedBody.length);
      var hashTag = convertTextToHashTag(text);
      var urlForHashTag = hashTagUrl(hashTag);
      var middle = "<a href=\"" + urlForHashTag  + "\">&#35;" + hashTag + "</a>";
      strippedBody = left + middle + right;
    }
    msgSpan.innerHTML = strippedBody;
    li.appendChild(msgSpan);
  }
  if (message.chuteUrls != null && message.chuteUrls.length > 0) {
    for (var i=0; i<message.chuteUrls.length; i++) {
      var url = message.chuteUrls[i];
      var img = document.createElement("img");
      img.src = Chute.fit(400, 300, url);
      li.appendChild(img);
    }
  }
  return li;
};

var htmlEntities = function(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

var convertTextToHashTag = function(text) {
  text = text.replace(/\s/gi, "-");
  text = text.replace(/\+/gi, "-");
  text = text.replace(/[^-a-zA-Z0-9\-]+/ig, '');
  return text.toLowerCase();
};

var hashTagUrl = function(hashTag) {
  return "/" + convertTextToHashTag(hashTag);
};

var updateRoomCount = function(count) {
  this.roomCountSpan.innerHTML = count;
};

var relayoutStreamsForElementCount = function(length) {
  if (length == 1) {
    this.streamsContainer.id = "single-stream";
  } else if (length == 2) {
    this.streamsContainer.id = "double-stream";
  } else if (length <= 4) {
    this.streamsContainer.id = "quad-stream";
  } else if (length > 4 && length <= 6) {
    this.streamsContainer.id = "six-stream";
  } else if (length > 6 && length <= 9) {
    this.streamsContainer.id = "nine-stream";
  } else if (length > 9 && length <= 12) {
    this.streamsContainer.id = "twelve-stream";
  } else {
    throw ("max video streams: " + length);
  }

  var max = 9;
  if (length >= max) {
    this.roleButton.className = "hidden";
  } else {
    if (this.publisher === null) {
      this.roleButton.className = "";
    }
  }

  updateRoomCount.apply(this, [length]);
};

var getToken = function(session, gotTokenFunc) {
  var req = new XMLHttpRequest();
  req.open("POST", "/api/token/?session=" + session, true);
  req.onreadystatechange = function(e) {
    if (this.readyState == 4) {
      gotTokenFunc(req.responseText);
    }
  };
  req.send();
};

var loadTokBox = function(token) {
  var sessionId = this.foundSession; 
  if (TB.checkSystemRequirements() != TB.HAS_REQUIREMENTS) {
    alert("You don't have the minimum requirements to run this application." + "Please upgrade to the latest version of Flash.");
  } else {
    TB.addEventListener("exception", tokboxExceptionHandler);
    this.session = TB.initSession(sessionId);
    this.session.addEventListener('sessionDisconnected', sessionDisconnectedHandler.bind(this));
    this.session.addEventListener('sessionConnected', addsAllStreamsFromEventHandler.bind(this));
    this.session.addEventListener('streamCreated', addsAllStreamsFromEventHandler.bind(this));
    this.session.addEventListener('streamDestroyed', streamDestroyedHandler.bind(this));
    //this.session.addEventListener('connectionCreated', connectionCreatedHandler);
    //this.session.addEventListener('connectionDestroyed', connectionDestroyedHandler);
    this.session.connect(this.apiKey, token);
  }
};

var addsAllStreamsFromEventHandler = function(event) {
  // Subscribe to the newly created streams
  for (var i = 0; i < event.streams.length; i++) {
    addStream.apply(this, [event.streams[i]]);
  }
};

var streamDestroyedHandler = function(event) {
  // This signals that a stream was destroyed. Any Subscribers will automatically be removed.
  // This default behaviour can be prevented using event.preventDefault()
  var length = (this.streamsContainer.children.length) - 1;
  relayoutStreamsForElementCount.apply(this, [length]);
};

var sessionDisconnectedHandler = function(event) {
  // This signals that the user was disconnected from the Session. Any subscribers and publishers
  // will automatically be removed. This default behaviour can be prevented using event.preventDefault()
  this.publisher = null;
};

var addStream = function(stream) {
  // Check if this is the stream that I am publishing, and if so do not publish.
  if (stream.connection.connectionId == this.session.connection.connectionId) {
    return;
  }
  var length = (this.streamsContainer.children.length) + 1;
  relayoutStreamsForElementCount.apply(this, [length]);
  var subscriberDiv = document.createElement('div');
  subscriberDiv.setAttribute('id', stream.streamId);
  this.streamsContainer.appendChild(subscriberDiv);
  this.subscribers[stream.streamId] = this.session.subscribe(stream, subscriberDiv.id);
};

var onChatMessageChildAdded = function(snapshot) {
  //We'll fill this in later.
  var message = snapshot.val();
  var newMessageLi = createMessageLi(message, message);
  this.messagesList.appendChild(newMessageLi);
  var chatFeed = document.getElementById("chat-feed");
  chatFeed.scrollTop = chatFeed.scrollHeight;
};

// Called when user wants to start publishing to the session
var onRoleButtonClick = function(ev) {
  ev.preventDefault();
  if (!this.publisher) {
    var parentDiv = this.myselfContainer;
    var publisherDiv = document.createElement('div');
    var publisherDivDiv = document.createElement('div');
    publisherDivDiv.setAttribute('id', "publisher-repl");
    publisherDiv.setAttribute('id', 'publisher');
    publisherDiv.appendChild(publisherDivDiv);
    parentDiv.insertBefore(publisherDiv, parentDiv.firstChild);
    this.publisher = this.session.publish(publisherDivDiv.id);
    this.roleButton.className = "hidden";
    this.roleSpan.className = "guest";
    this.roleSpan.innerHTML = "GUEST";
  }
  return false;
};

var stopPublishing = function() {
  if (this.publisher) {
    this.session.unpublish(this.publisher);
  }
  this.publisher = null;
};

document.addEventListener("DOMContentLoaded", function () {
  var freshtag = {
    gravatarUrl: createGravatarUrl(),
    chute: Chute.setApp('504d2f11cc72f836e3000001'),
    subscribers: {},
    apiKey: 20179871,
    session: null,
    foundSession: null,
    publisher: null,
    chatDataRef: null,
    sessionDataRef: null,
    myselfContainer: document.getElementById("myself"),
    roleButton: document.getElementById("role-button"),
    roleSpan: document.getElementById("role-span"),
    freshtagForm: document.getElementById("freshtag-form"),
    freshtagButton: document.getElementById("freshtag-button"),
    freshtagInput: document.getElementById("freshtag-input"),
    chatInput: document.getElementById("chat-input"),
    chatButton: document.getElementById("chat-button"),
    messagesList: document.getElementById("posted_msgs"),
    streamsContainer: document.getElementById("streams").children[0],
    roomCountSpan: document.getElementById("room-count"),
    chatForm: document.getElementById("chat-form"),
    chatMediaButton: document.getElementById("chat-media-button"),
    webrtc: window.location.host.indexOf("rtc") != -1,
  };

  freshtag.freshtagForm.onsubmit = onFreshtagFormSubmit.bind(freshtag);
  freshtag.roleButton.onclick = onRoleButtonClick.bind(freshtag);
  freshtag.chatForm.onsubmit = onChatFormSubmit.bind(freshtag);
  freshtag.chatMediaButton.onclick = onChatMediaButtonClick.bind(freshtag);
  freshtag.freshtagInput.focus();

  var parameters = {
    hashtag: window.location.pathname.split("/")[1]
  };
  if (parameters.hashtag) {
    //document.body.className = "started-connected";
    freshtag.freshtagInput.value = parameters.hashtag;
    freshtag.freshtagButton.click();
  }

  x = Math.floor((Math.random()*11)+1);
  document.getElementById("body").style.backgroundImage="url(../images/bg"+x+".jpg)";

});
//};
