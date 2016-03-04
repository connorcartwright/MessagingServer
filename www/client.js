$(function() {
  // Added variable to access inputs/displays
  var $window = $(window);
  var $usernameInput = $('input.usernameInput');   // username input
  var $messages = $('ul.chatLog');              // get whole chat log element
  var $inputMessage = $('input.messageInput');  // get new message input area
  var socket = io();

  var username;
  var colour;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var typing_timeout = 400;
  var $currentInput = $usernameInput.focus();

  var evenRow = true;

  var $loginPage = $('.page.login'); // The login page
  var $chatPage = $('.page.chat'); // The chatroom page

  socket.on('user joined', function (data) {
    printConsoleMessage(data.username + ' joined the room.');
    printNumUsers(data);
  });

  socket.on('login', function (data) {
    connected = true;
    // display welcome message
    var $header = $('div.chatHeader>span');
    $header.html('Hey <i>' + username + '</i>, welcome to the chat!');
    printConsoleMessage(username + ' joined the room.');
    printNumUsers(data);
  });

  socket.on('user left', function (data) {
    printConsoleMessage(data.username + ' left the room.');
    printNumUsers(data);
  });

  socket.on('typing', function (data) {
    userIsTyping(data);
  });

  // kill the typing message on stop typing
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('new message', function (data) {
    printMessage(data);
  });

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // helper function to print a console message to chat 
  function printConsoleMessage(message) {
    var $message = $('<li class="message consoleMessage">' + message + '</li>');
    $messages.append($message);
  }

  // helper function to print a chat message to chat 
  function printMessage(data) {
    var $message = $('<li class="message chatMessage ' + (evenRow ? 'even' : 'odd') + '" style="background-color: ' + color(data.username) + '"><span>' + data.username + ': ' + data.message + '</span></li>');
    evenRow = !evenRow;
    $messages.append($message);
  }

  function printTypingMessage(data) {
    var $message = $('<li class="message typing message chatMessage ' + (evenRow ? 'even' : 'odd') + '" data-username="' + data.username + '" style="background-color: ' + color(data.username) + '"><span>' + data.username + data.message + '</span></li>');
    evenRow = !evenRow;
    $messages.append($message);
  }

  function sendMessage() {
    var message = $inputMessage.val();
    // if user is connected and has a message
    if (connected && message) {
        $inputMessage.val('');
        printMessage({
          username: username,
          message: message
        });
        socket.emit('new message', message);
    }
  }

  // helper function to print the number of users in the room
  function printNumUsers(data) {
    if (data.numUsers > 1) {
      printConsoleMessage('There are ' + data.numUsers + ' active users.');
    }
    else if (data.numUsers == 1)  {
      printConsoleMessage('There is only 1 active user.');
    }
  }

  // helper function to show a user is typing
  function userIsTyping(data) {
    data.typing = true;
    data.message = ' is typing...';
    printTypingMessage(data);
  }

    // Sets the client's username
  function setUsername () {
    username = $usernameInput.val();
    // if the username is valid
    if (username) {
      colour = color(username);
      $loginPage.fadeOut(600);
      $chatPage.fadeIn(1200)
      $currentInput = $inputMessage.focus();

      // Tell the server the username
      socket.emit('add user', username);
    }
  }

  $window.keydown(function(event) {
    if (event.which === 13) { // if the user pressed ENTER
      if (username) { // if the user is loggedIn
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else { // else log them in
          setUsername();
      }
    }
  });

  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= typing_timeout && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, typing_timeout);
    }
  }

  // color and increase brightness functions taken from stack overflow
  function color(string) {
      return increase_brightness('#' + md5(string).slice(0, 6), 50);
  }


  function increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}


});