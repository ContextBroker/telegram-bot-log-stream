var Duplex = require('stream').Duplex

var inherits = require('inherits')
var Telegram = require('telegram-bot-api')


function emitError(message, data)
{
  var error = new Error(message)
      error.data = data

  this.emit('error', error)
}

/**
 * Process a single received Telegram `Update` object
 *
 * @param {Object} update
 *
 * @return Boolean - more `Update` objects can be fetch
 */
function processUpdate(update)
{
  var message = update.message
  if(message == null)
    return emitError.call(this, 'Inline queries are not supported', update)

  if(message.chat.id !== this.chat_id)
    return emitError.call(this, 'Received message for not-listening chat', message)

  var text = message.text
  if(text == null)
    return emitError.call(this, 'Only text messages are supported', message)

  return this.push(message.text)
}


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

  Object.defineProperties(this,
  {
    token:   {value: token},
    chat_id: {value: chat_id}
  })

  var _updatesOffset = 0

  var inFlight
  var req

  var api = new Telegram({token: token})


  //
  // Private functions
  //

  /**
   * Process a Telegram `Update` object and check if it should do more requests
   *
   * @param {Boolean} fetchMoreDate
   * @param {Object} update
   *
   * @return Boolean - more `Update` objects can be fetch
   */
  function processUpdate_reduce(fetchMoreDate, update)
  {
    // Account update_id as next offset
    // to avoid dublicated updates
    var update_id = update.update_id
    if(update_id >= _updatesOffset)
      _updatesOffset = update_id + 1

    return processUpdate.call(self, update) && fetchMoreDate
  }

  /**
   * Process received Telegram `Update` objects and queue a new polling request
   *
   * @param {Array} data
   */
  function gotUpdates(data)
  {
    inFlight = false

    if(data.reduce(processUpdate_reduce, true)) setTimeout(self._read, 1000)
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
    .then(gotUpdates)
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
