$(document).ready(function(){
  // Initialize client 
  var socket = io(); 

  // Initalize variables to hold user data 
  let username = '';
  let color =  {
    red: 0,
    green: 0, 
    blue: 0
  };
  
  // When user clicks the 'Send' button or hits the enter key, send the text they entered to the server 
  $('form').submit(function(e){
    e.preventDefault();
    socket.emit('chat message', $('#message-input').val());
    $('#message-input').val('');
    return false;
  });

  // Listen for the 'join' event emittted from the server
  socket.on('join', function(newUser) {
    // Set user's data
    username = newUser.username;
    color = newUser.color;

    // Update UI to display user's name
    $("#username").text(username);

    // Write the user's name into the cookie
    document.cookie = ("username=" + username);
  });

  // Listen for the 'user update' event emitted from the server
  socket.on('user update', function(userUpdateMessage) {
    // Write server message into the chat box
    $('#messages').append($("<li class='userMessage'>").text(userUpdateMessage));
    updateScroll();
  })

  // Listen for the 'change nickname' event emitted from the server
  socket.on('change nickname', function(nicknameCommand) {
    // Set client side data and udpate cookie
    username = nicknameCommand.newName;
    document.cookie = ("username=" + username);

    // Update UI to accommodate the changed nickname and display the command 
    $("#username").text(username);
    $('#messages').append($("<li class='commandMessage'>").text(nicknameCommand.command));
    updateScroll();
  });

  // Listen for the 'change nick color' event emitted from the server 
  socket.on('change nick color', function(colorCommand) {
    // Set client side data
    color.red = colorCommand.color.red;
    color.green = colorCommand.color.green;
    color.blue = colorCommand.color.blue;

    // Display the command 
    $('#messages').append($("<li class='commandMessage'>").text(colorCommand.command));
    updateScroll();
  });
  
  // Listen for the 'error message' event 
  socket.on('error message', function(errorMessage) {
    // Display the invalid command and an error message 
    $('#messages').append($("<li class='commandMessage'>").text(errorMessage.command));
    $('#messages').append($("<li class='commandMessage errorMessage'>").text(errorMessage.error));
    updateScroll();
  })

  // Listen for the 'success message' event 
  socket.on('success message', function(successMessage) {
    $('#messages').append($("<li class='commandMessage successMessage'>").text(successMessage.success));
    updateScroll();
  })

  // Listen for the 'chat message' event 
  socket.on('chat message', function(message) {
    // Create the list item to display 
    let listItem = $("<li class='chat-message'>" +
      "<span>[" + message.timestamp.hours +":" + message.timestamp.minutes + ":" + message.timestamp.seconds + "] </span>" + 
      "<span style='color: #" + message.user.color + "'>" + message.user.username +": </span>" + 
      "<span>" + message.text + "</span></li>");

    // If the message was sent by the current user, bold it
    if (username === message.user.username) {
      $(listItem).addClass("bold-text");
    }         

    // Display the message in the chat box
    $('#messages').append(listItem);
    updateScroll();
  });


  // Listen for the 'chat history' event 
  socket.on('chat history', function(chatHistory){
    for (let i = 0; i < chatHistory.length; i++) {
      // Create the list item to display 
      let listItem = $("<li class='chat-message'>" +
        "<span>[" + chatHistory[i].timestamp.hours +":" + chatHistory[i].timestamp.minutes + ":" + chatHistory[i].timestamp.seconds + "] </span>" + 
        "<span style='color: #" + chatHistory[i].user.color + "'>" + chatHistory[i].user.username +": </span>" + 

        "<span>" + chatHistory[i].text + "</span>" + 
        "</li>");

      // If the message was sent by the current user, bold it
      if (username === chatHistory[i].user.username) {
        $(listItem).addClass("bold-text");
      }    

      // Display the message in the chat box
      $('#messages').append(listItem);

      // Scroll to the bottom of the chat box
      updateScroll();
    }
  });

  // Listen for the 'current users' event 
  socket.on('current users', function(currentUsers){
    // Remove all children inside the user box
    $('#users').empty();

    // For each current user, populate the user box with new list items 
    for (let i = 0; i < currentUsers.length; i++) {
      $('#users').append($('<li>').text(currentUsers[i]));
    }
  });

  // Scroll to the bottom of the chatbox
  function updateScroll() {
    var chatbox = $("#chatbox");
    chatbox[0].scrollTop = chatbox[0].scrollHeight;
  } 
});