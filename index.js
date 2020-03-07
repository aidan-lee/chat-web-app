var app = require('express')();
const express = require('express');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')

// Initializing variables to hold data 
var chatHistory = []; 
var currentUsers = [];
var currentUserNames = [];
var userCount = 0;

// Initializing regexes to detect the \nick and \nickcolor commands
var nickRegex = new RegExp("^\\\\nick ");
var nickColorRegex = new RegExp("^\\\\nickcolor ");

// Constant lengths for command parsing 
const nickCommandSplitLength = 2; 
const nickColorLength = 6;

app.use(express.static('public'));
app.use(cookieParser());

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


// Listens for socket connections and handles communication with the socket
io.on('connection', function(socket){
  console.log('a user connected');

  // Create an object to hold information for the new user
  var newUser = {
    username: "User " + userCount++,
    socketId: socket.id,
    color: 000000
  }

  // If a cookie exists and contains 'username=', parse the cookie to find the existing username 
  if (socket.handshake.headers.cookie && socket.handshake.headers.cookie.indexOf('username=') !== -1) {
    // Cookie is in the form (text) username=(username); (more text)
    // To get the username, we first split by "username="
    var splitUsername = socket.handshake.headers.cookie.split("username=");
    // The result is an array, with [1] being (text) and [2] being (username); (more text)
    // We split [1] by the ; delimiter
    var splitSemicolon = splitUsername[1].split(";");
    // The final result is stored in [0] of the new array
    var cookieUsername = splitSemicolon[0];

    currentUserNames = currentUsers.map(x => x.username);

    if (!currentUserNames.includes(cookieUsername)) {
      newUser.username = cookieUsername;
    }
  } 
  currentUsers.push(newUser);
  currentUserNames = currentUsers.map(x => x.username);

  // Populate user list
  io.emit('current users', currentUserNames);
  // Set user's username and color on the client side 
  socket.emit('join', newUser);
  // Populate chat history 
  socket.emit("chat history", chatHistory);
  // Print an entry message for the user 
  io.emit("user update", (newUser.username + " entered the chat"));

  // If the user disconnects, remove them from the list of current users
  socket.on('disconnect', function(){
    console.log('user disconnected');
    removeUser(socket.id);
    io.emit('current users', currentUserNames);
  });

  // If the user submits the chat form, detect and handle commands or emit the message to other users
  socket.on('chat message', function(msg){
    // If the message is not empty, determine how to handle it 
    if (msg.trim() !== "") {
      // Determinig if the message is a \nick or \nickcolor command
      let isNickCommand = nickRegex.test(msg);
      let isNickColorCommand = nickColorRegex.test(msg);

      let name = getUsername(socket.id);
      let color = getUserColor(socket.id);

      if (isNickColorCommand) {
        handleNickColorCommand(socket, msg);
      }
      else if (isNickCommand) {
        handleNickCommand(socket, msg);
      } 
      else {
        let message = handleSendMessage(name, color, msg);
        io.emit('chat message', message); //Broadcast the message to other socket connections
      }
    }   
  });
});

http.listen(3000, function(){
  console.log('Listening on port 3000');
});

// Removes the user associated with the socket ID from the list of current users 
function removeUser(socketId) {
  var user = currentUsers.find(function(user) {
    return user.socketId == socketId;
  });

  var index = currentUsers.indexOf(user);
  if (index > -1) {
    currentUsers.splice(index, 1);
    currentUserNames = currentUsers.map(x => x.username);
    io.emit("user update", (user.username + " left the chat"));
  }
}

// Parse and respond to the \nickcolor command
function handleNickColorCommand(socket, msg) {
  color = getColor(msg);
      
  // If color exists, the command was valid. Change the user's color
  if (color) {
    let colorCommand = {
      command: msg,
      color: color
    }
    setUserColor(socket.id, color);
    color = getUserColor(socket.id)
    socket.emit('change nick color', colorCommand);

    let successMessage = {
      command: msg,
      success: ("Success. New color is #" + color + ".") 
    }
    socket.emit('success message', successMessage);
  }
  // If color is undefined, the command was not valid. Display an error message
  else {
    let errorMessage = "Incorrect command format.  To change color, use \\nickcolor RRGGBB";

    let error = {
      command: msg,
      error: errorMessage
    }
    socket.emit('error message', error);
  }
}

// Parse and respond to the \nick command
function handleNickCommand(socket, msg) {
  var newNickname = getNickname(msg);

  // If newNickname exists, the command was valid.
  if (newNickname) {
    let nicknameCommand = {
      command: msg, 
      newName: newNickname
    }

    currentUserNames = currentUsers.map(x => x.username);

    // If the desired nickanme is being used, show an error 
    if (currentUserNames.includes(newNickname)) {
      let errorMessage = "Nickname taken.  Please choose another.";
      let error = {
        command: msg,
        error: errorMessage
      }
      socket.emit('error message', error);
    }
    // If the desired nickname is not being used, change the user's nickname
    else {
      setUsername(socket.id, newNickname);
      name = getUsername(socket.id);
      socket.emit('change nickname', nicknameCommand);

      let successMessage = {
        command: msg,
        success: ("Success. New nickname is " + newNickname + ".") 
      }
      socket.emit('success message', successMessage);

      currentUserNames = currentUsers.map(x => x.username);
      socket.emit('current users', currentUserNames);
      io.emit('current users', currentUserNames);
    }
  }
  // If newNickname is undefined, the command was not valid. Show an error message
  else {
    let errorMessage = "Incorrect command format.  To change name, type '\\nick newName'";

    let error = {
      command: msg,
      error: errorMessage
    }
    socket.emit('error message', error);
  }
}

// Store messages sent
function handleSendMessage(name, color, msg) {
  let time = new Date();

  let message = {
    timestamp: {
      hours: time.getHours(),
      minutes: time.getMinutes() < 10 ? "0" + time.getMinutes() : time.getMinutes(),
      seconds: time.getSeconds() < 10 ? "0" + time.getSeconds() : time.getSeconds()
    },
    user: {
      username: name,
      color: color
    }, 
    text: msg
  }

  chatHistory.push(message);
  return message;
}

// Pull username from currentUsers array, based on matching socket ID
function getUsername(socketId) {
  var name = currentUsers.find(function(user) {
    return user.socketId == socketId;
  }).username;

  return name;
}

// Set new username in currentUsers array, based on matching socket ID
function setUsername(socketId, newUsername) {
  var user = currentUsers.find(function(user) {
    return user.socketId == socketId;
  });
  user.username = newUsername;
}

// Pull color from currentUsers array, based on matching socket ID
function getUserColor(socketId) {
  var color = currentUsers.find(function(user) {
    return user.socketId == socketId;
  }).color;

  return color;
}

// Set new color in currentUsers array, based on matching socket ID
function setUserColor(socketId, color) {
  var user = currentUsers.find(function(user) {
    return user.socketId == socketId;
  });
  user.color = color;
}

// Parse the \nick command to return the new nickname 
function getNickname(command) {
  let splitBySpace = command.split(" ");
  if (splitBySpace.length !== nickCommandSplitLength) {
    return null;
  }
  else
   {
    return splitBySpace[1];
  }

}

// Parse the \nickcolor command to return the new color
function getColor(command) {
  let splitBySpace = command.split(" ");

  if (splitBySpace.length !== nickCommandSplitLength) {
    return null;
  }
  else {
    let color = splitBySpace[1];
    if (color.length !== nickColorLength) {
      return null;
    }
    else {
      return color;
    }
  }

}