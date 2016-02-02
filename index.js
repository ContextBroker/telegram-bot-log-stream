var Duplex = require('stream').Duplex

var inherits = require('inherits')
var Telegram = require('telegram-bot-api')


/**
 * Send data as messages to a Telegram chat
 *
 * @param {Object} [options]
 * @param {Integer} [options.worksheet=1]
 */
function TelegramLog(token, chat_id, options)
{
  if(!(this instanceof TelegramLog))
    return new TelegramLog(token, chat_id, options)

  var self = this

  options = options || {}
  options.objectMode = true

  TelegramLog.super_.call(this, options)


  if(!token)   throw 'Missing token'
  if(!chat_id) throw 'Missing chat_id'


  var api = new Telegram(
  {
    token: token,
    updates:
    {
      enabled: true
    }
  })

  api.on('message', function(message)
  {
    if(message.chat.id !== chat_id)
    {
      var error = new Error('Received message for not-listening chat')
          error.data = message

      return self.emit('error', error)
    }

    self.push(message.text)
  })


  /**
   * Write a streamed row on the worksheet
   *
   * @param {Object} data
   * @param {*} _ - ignored
   * @param {Function} callback
   *
   * @private
   */
  this._write = function(chunk, _, callback)
  {
    if(chunk == null || chunk == '') return callback()

    api.sendMessage(
    {
  		chat_id: chat_id,
  		text: JSON.stringify(chunk)
  	})
    .then(callback.bind(null, null), callback)
  }
}
inherits(TelegramLog, Duplex)


TelegramLog.prototype._read = function(){}


module.exports = TelegramLog
