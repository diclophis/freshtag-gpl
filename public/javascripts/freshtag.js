document.addEventListener("DOMContentLoaded", function () {
  
  Chute.setApp('504d2f11cc72f836e3000001');

  var dynamicToken = null;
  var liveContainer = document.getElementById("live");
  var streamsContainer = document.getElementById("streams").children[0];
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var chatButton = document.getElementById("chat-button");
  var chatMediaButton = document.getElementById("chat-media-button");
  var sessionDataRef = null;
  var chatDataRef = null;
  var messagesList = document.getElementById("posted_msgs");
  var publisher = null;
  var subscribers = {};

  var relayoutStreamsForElementCount = function(length) {
    if (length == 1) {
      streamsContainer.id = "single-stream";
    } else if (length == 2) {
      streamsContainer.id = "double-stream";
    } else if (length <= 4) {
      streamsContainer.id = "quad-stream";
    } else if (length > 4 && length <= 6) {
      streamsContainer.id = "six-stream";
    } else if (length > 6 && length <= 9) {
      streamsContainer.id = "nine-stream";
    } else if (length > 9 && length <= 12) {
      streamsContainer.id = "twelve-stream";
    } else {
      throw ("max video streams: " + length);
    }
  };

  var createNewStreamDiv = function() {
    var length = (streamsContainer.children.length) + 1;
    relayoutStreamsForElementCount(length);
    //var newStreamDiv = document.createElement('div');
    //newStreamDiv.className = "stream";
    //streamsContainer.appendChild(newStreamDiv);
    var newStreamRepl = document.createElement('div');
    streamsContainer.appendChild(newStreamRepl);
    return newStreamRepl;
  }

  var getSession = function(gotSessionFunc) {
    var req = new XMLHttpRequest();
    req.open("POST", "/session", true);
    req.onreadystatechange = function(e) {
      if (this.readyState == 4) {
        gotSessionFunc(req.responseText);
      }
    };
    req.send();
  };

  var getToken = function(session, gotTokenFunc) {
    var req = new XMLHttpRequest();
    req.open("POST", "/token/?session=" + session, true);
    req.onreadystatechange = function(e) {
      if (this.readyState == 4) {
        gotTokenFunc(req.responseText);
      }
    };
    req.send();
  };

  var loadTokBox = function(sessionId, token) {
    var apiKey = 20179871;
    var session = null;

    if (TB.checkSystemRequirements() != TB.HAS_REQUIREMENTS) {
      alert("You don't have the minimum requirements to run this application." + "Please upgrade to the latest version of Flash.");
    } else {
      TB.addEventListener("exception", exceptionHandler);
      session = TB.initSession(sessionId);
      session.addEventListener('sessionConnected', sessionConnectedHandler);
      session.addEventListener('sessionDisconnected', sessionDisconnectedHandler);
      session.addEventListener('connectionCreated', connectionCreatedHandler);
      session.addEventListener('connectionDestroyed', connectionDestroyedHandler);
      session.addEventListener('streamCreated', streamCreatedHandler);
      session.addEventListener('streamDestroyed', streamDestroyedHandler);
      session.connect(apiKey, token);
    }

    // Called when user wants to start publishing to the session
    function startPublishing() {
      if (!publisher) {
        var parentDiv = document.getElementById("myself");
        var publisherDiv = document.createElement('div');
        var publisherDivDiv = document.createElement('div');
        publisherDivDiv.setAttribute('id', "publisher-repl");
        publisherDiv.setAttribute('id', 'publisher');
        publisherDiv.appendChild(publisherDivDiv);
        parentDiv.insertBefore(publisherDiv, parentDiv.firstChild);
        publisher = session.publish(publisherDivDiv.id);
        //publisher = session.publish(parentDiv.id);
        //liveContainer.className = "connected";
      }
    }

    function stopPublishing() {
      if (publisher) {
        session.unpublish(publisher);
      }
      publisher = null;
    }
  
    function sessionConnectedHandler(event) {
      // Subscribe to all streams currently in the Session
      for (var i = 0; i < event.streams.length; i++) {
        addStream(event.streams[i]);
      }
      startPublishing();
    }

    function streamCreatedHandler(event) {
      // Subscribe to the newly created streams
      for (var i = 0; i < event.streams.length; i++) {
        addStream(event.streams[i]);
      }
    }

    function streamDestroyedHandler(event) {
      // This signals that a stream was destroyed. Any Subscribers will automatically be removed.
      // This default behaviour can be prevented using event.preventDefault()
      var length = (streamsContainer.children.length) - 1;
      relayoutStreamsForElementCount(length);
    }

    function sessionDisconnectedHandler(event) {
      // This signals that the user was disconnected from the Session. Any subscribers and publishers
      // will automatically be removed. This default behaviour can be prevented using event.preventDefault()
      publisher = null;
    }

    function connectionDestroyedHandler(event) {
      // This signals that connections were destroyed
      console.log("connectionDestroyedHandler");
    }

    function connectionCreatedHandler(event) {
      // This signals new connections have been created.
      console.log("connectionCreatedHandler");
    }

    function exceptionHandler(event) {
      alert("Exception: " + event.code + "::" + event.message);
    }

    function addStream(stream) {
      // Check if this is the stream that I am publishing, and if so do not publish.
      if (stream.connection.connectionId == session.connection.connectionId) {
        return;
      }
      var subscriberDiv = createNewStreamDiv();
      subscriberDiv.setAttribute('id', stream.streamId);
      subscribers[stream.streamId] = session.subscribe(stream, subscriberDiv.id);
    }
  };

  function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var createMessageLi = function(message) {
    
    var li = document.createElement("li");

    if (message.imgData != null && message.imgData.length > 0) {
      var img = document.createElement("img");
      img.setAttribute("src", "data:image/png;base64," + (message.imgData));
      li.appendChild(img);
    }

    if (message.body != null) {
      var msgSpan = document.createElement("p");
      msgSpan.innerHTML = htmlEntities(message.body);
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

  var onGetSession = function(e) {
    e.preventDefault();
    var hash = document.getElementById("freshtag-input").value;
    var namearr = hash.split("#"); // #topic -> ['', topic']

    var topic = namearr[namearr.length - 1]; // get last element from namearr
    document.getElementById("freshtag").innerHTML = topic;
    sessionDataRef = new Firebase('http://gamma.firebase.com/brickapp/freshtag/session/' + topic);
    chatDataRef = new Firebase('http://gamma.firebase.com/brickapp/freshtag/chat/' + topic);
    sessionDataRef.on("value", function(snapshot) {
      var foundSession = snapshot.val();
      if (foundSession != null) {
        getToken(foundSession, function(tokenFromRuby) {
          loadTokBox(foundSession, tokenFromRuby);
        });
      } else {
        getSession(function(newSession) {
          sessionDataRef.set(newSession);
        });
      }
    });

    var ts = Math.round(new Date().getTime() / 1000);
    ts -= 60;

    chatDataRef.limit(10).on('child_added', function(snapshot) {
      //We'll fill this in later.
      var message = snapshot.val();
      var newMessageLi = createMessageLi(message, message);
      messagesList.appendChild(newMessageLi);
      var chatFeed = document.getElementById("chat-feed");
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });

    return false;
  };

  var createMessage = function() {
    var message = {
      imgData: (publisher.getImgData()),
      body: null,
      chutUrls: null
    };
    return message;
  };

  var pushMessage = function(message) {
    if (chatDataRef != null) {
      chatInput.disabled = true;
      chatButton.disabled = true;
      chatDataRef.push(message, function() {
        chatInput.value = "";
        chatInput.disabled = false;
        chatButton.disabled = false;
        chatInput.focus();
      });
    }
  };

  document.getElementById("freshtag-form").onsubmit = onGetSession;

  chatForm.onsubmit = function(e) {
    e.preventDefault();

    var message = createMessage();
    message.body = chatInput.value;
    pushMessage(message);

    return false;
  };

  chatMediaButton.onclick = function(e) {
    e.preventDefault();
    Chute.MediaChooser.choose(function(urls, data) {
      var message = createMessage();
      message.chuteUrls = urls;
      pushMessage(message);
    });
    return false;
  };
});
