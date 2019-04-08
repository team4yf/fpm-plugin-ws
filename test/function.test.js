const { init, Func } = require("fpmc-jssdk");
const assert = require('assert');
const WebSocket = require('ws')
init({ appkey:'123123', masterKey:'123123', endpoint: 'http://localhost:9999/api' });

const ws = new WebSocket('ws://localhost:10100/');
 
ws.on('open', function open() {
  //ws.send('something');
  ws.send(JSON.stringify({ _id: '111', payload: '1111'}))
  console.log('connected');
});
 
ws.on('message', function incoming(data) {
  console.log('received', data)
});
describe('Function', function(){
  before(done => {
    
    done()
  })


  after(done => {
    ws.close();
    done()
  })

  it('Function A', async () => {
    try {
      const data = await new Func('ws.broadcast').invoke({ payload: JSON.stringify({ _id: 'bbb', cardId: 'aaa'})})
      console.log('function rsp: ', data)
      assert.strictEqual(data == undefined, false, 'should not be undefined');
    } catch (error) {
      throw error;
    }
  })
})
