var Duplex = require('stream').Duplex

var inherits = require('inherits')
var Telegram = require('telegram-bot-api')


/**
 * Send data as messages to a Telegram chat
 *
 * @param {string} token
 * @param {string} chat_id
 * @param {Object} [options]
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

  var _updatesOffset = 0

  var inFlight
  var req

  var api = new Telegram({token: token})


  /**
   * Process data from an update
   *
   * @param {Boolean} fetchMoreDate
   * @param {Object} item
   *
   * @return Boolean
   */
  function processData(fetchMoreDate, item)
  {
    // Account update_id as next offset
    // to avoid dublicated updates
    if(item.update_id >= _updatesOffset)
      _updatesOffset = item.update_id + 1

    var message = item.message
    if(message.chat.id !== chat_id)
    {
      var error = new Error('Received message for not-listening chat')
          error.data = message

      return self.emit('error', error)
    }

    return self.push(message.text) && fetchMoreDate
  }

  /**
   * Process a received update
   *
   * @param {Array} data
   */
  function gotUpdate(data)
  {
    inFlight = false

    if(data.reduce(processData, true)) setTimeout(self._read, 1000)
  }

  /**
   * Emit an error when requesting updates and free `inFlight` flag
   *
   * @param {Error} error
   */
  function onError(error)
  {
    inFlight = false

    self.emit('error', error)
  }


  /**
   * Request new updates
   *
   * @private
   */
  this._read = function()
  {
    var state = self._readableState
    var limit = state.highWaterMark - state.length

    if(inFlight || state.ended || !limit) return

    inFlight = true

    req = api.getUpdates({
      offset: _updatesOffset,
      limit: limit,
      timeout: 0
    })
    .then(gotUpdate)
    .catch(onError)
  }

  /**
   * Write a streamed row on the worksheet
   *
   * @param {Object} chunk
   * @param {*} _ - ignored
   * @param {Function} done
   *
   * @private
   */
  this._write = function(chunk, _, done)
  {
    if(chunk == null || chunk == '') return done()

    api.sendMessage(
    {
  		chat_id: chat_id,
  		text: JSON.stringify(chunk)
  	})
    .then(done.bind(null, null), done)
  }

  /**
   * Close the connection and stop emitting more data updates
   */
  this.close = function()
  {
    if(req)
    {
//      req.abort()
      req = null
    }

    this.push(null)
  }
}
inherits(TelegramLog, Duplex)


module.exports = TelegramLog
