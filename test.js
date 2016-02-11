var assert  = require('assert')
var parse   = require('url').parse
var request = require('http').request

var decode = require('partly').Multipart.decode
var nock   = require('nock')

var TelegramLog = require('./index')

nock.disableNetConnect()


const SERVER  = 'api.telegram.org'
const TOKEN   = 'token'
const CHAT_ID = 'chat_id'


var server = nock('https://'+SERVER)


var log


afterEach(function()
{
  if(!nock.isDone())
    console.error('pending mocks: %j', nock.pendingMocks())

  nock.cleanAll()

  log.close()
})


describe('recv polling', function()
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

    log = TelegramLog(TOKEN, CHAT_ID)
    .on('error', done)
    .on('data', function(data)
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


    log = TelegramLog(TOKEN, CHAT_ID)
    .on('error', function(error)
    {
      assert.deepEqual(error, expected)

      this.close()
    })
    .on('end', done)
    .resume()
  })
})


describe('recv webhook', function()
{
  it('receive update', function(done)
  {
    var expected = 'asdf'

    var message =
    {
      chat:
      {
        id: CHAT_ID
      },
      text: expected
    }

    server.post('/bot'+TOKEN+'/setWebhook')
    .reply(200, function(uri, requestBody)
    {
      var boundary = this.req.headers['content-type'].split('=')[1]

      var requestOptions = parse(decode(requestBody, boundary)[0].Body)
          requestOptions.method = 'POST'

      var requestData = JSON.stringify(
      {
        update_id: 0,
        message: message
      })

      request(requestOptions).end(requestData)

      return {}
    })


    var options =
    {
      webhook:
      {
        hostname: 'localhost',
        port: 8443
      }
    }

    log = TelegramLog(TOKEN, CHAT_ID, options)
    .on('error', done)
    .on('data', function(data)
    {
      assert.strictEqual(data, expected)

      this.close()
    })
    .on('end', done)
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


    server.post('/bot'+TOKEN+'/setWebhook')
    .reply(200, function(uri, requestBody)
    {
      var boundary = this.req.headers['content-type'].split('=')[1]

      var requestOptions = parse(decode(requestBody, boundary)[0].Body)
          requestOptions.method = 'POST'

      var requestData = JSON.stringify(
      {
        update_id: 0,
        message: message
      })

      request(requestOptions).end(requestData)

      return {}
    })


    var options =
    {
      webhook:
      {
        hostname: 'localhost',
        port: 8443
      }
    }

    log = TelegramLog(TOKEN, CHAT_ID, options)
    .on('error', function(error)
    {
      assert.deepEqual(error, expected)

      this.close()
    })
    .on('end', done)
    .resume()
  })
})


describe('send', function()
{
  it('send message', function(done)
  {
    var expected = {a: 'b'}

    server.post('/bot'+TOKEN+'/sendMessage').reply(200, function(uri)
    {
      done()

      return {}
    })


    log = TelegramLog(TOKEN, CHAT_ID)
    .on('error', done)

    log.write(expected)
  })
})
