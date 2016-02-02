var assert = require('assert')

var nock = require('nock')

var TelegramLog = require('./index')

nock.disableNetConnect()


const SERVER  = 'api.telegram.org'
const TOKEN   = 'token'
const CHAT_ID = 'chat_id'


var server = nock('https://'+SERVER)


afterEach(nock.cleanAll)


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
    assert.equal(data, expected)
    done()
  })
})

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
  server.post('/bot'+TOKEN+'/sendMessage').reply(function(uri)
  {
    done()
  })


  var log = TelegramLog(TOKEN, CHAT_ID)

  log.on('error', done)

  log.write(expected)
})
