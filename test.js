var assert = require('assert')

var nock = require('nock')

var TelegramLog = require('./index')

nock.disableNetConnect()


const SERVER  = 'api.telegram.org'
const TOKEN   = 'token'
const CHAT_ID = 'chat_id'


var server = nock('https://'+SERVER)


afterEach(nock.cleanAll)


describe('recv', function()
{
  it('receive update', function(done)
  {
    var expected = 'asdf'

    server.get('/bot'+TOKEN+'/getUpdates').reply(200,
    {
      result:
      [
        {
          update_id: 0,
          message:
          {
            chat:
            {
              id: CHAT_ID
            },
            text: expected
          }
        }
      ]
    })


    var log = TelegramLog(TOKEN, CHAT_ID)

    log.on('error', done)
    log.on('data', function(data)
    {
      assert.strictEqual(data, expected)

      this.close()
      done()
    })
  })

  it('receive update for other chat than us', function(done)
  {
    var message =
    {
      chat:
      {
        id: 'notTheChatYouAreLookingFor'
      }
    }

    var expected = new Error('Received message for not-listening chat')
        expected.data = message


    server.get('/bot'+TOKEN+'/getUpdates').reply(200,
    {
      result:
      [
        {
          update_id: 0,
          message: message
        }
      ]
    })


    var log = TelegramLog(TOKEN, CHAT_ID)

    log.on('error', function(error)
    {
      assert.deepEqual(error, expected)

      done()
    })
    log.resume()
  })
})

describe('send', function()
{
  it('send message', function(done)
  {
    var expected = {a: 'b'}

    server.get('/bot'+TOKEN+'/getUpdates').reply(200,
    {
      result:
      [{
        update_id: 0,
        message: {chat: {id: CHAT_ID}}
      }]
    })
    server.post('/bot'+TOKEN+'/sendMessage').reply(200, function(uri)
    {
      done()

      return {}
    })


    var log = TelegramLog(TOKEN, CHAT_ID)

    log.on('error', done)

    log.write(expected)
  })
})
