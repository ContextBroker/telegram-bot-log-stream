#!/usr/bin/env node

var TelegramLog = require('./index')


// Get Telegram bot `token` and `chat_id` as command arguments
var args = process.args

var token   = args[2]
var chat_id = args[3]


// Create the instance of `TelegramLog`
var log = TelegramLog(token, chat_id, 8443)
.on('error', function(error)
{
  console.trace('TelegramLog errored:', error)
})


// Just echo anything that receive
log.on('data', function(data)
{
  console.log('Incomming data:', data)

  this.write(data)
})
