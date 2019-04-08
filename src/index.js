const _ = require('lodash');
const pkg = require('../package.json');
const debug = require('debug')(pkg.name);
const assert = require('assert');
const WebSocketServer = require('ws').Server;
const crypto = require('crypto');

const generUid = () => {
  return new Promise( (resolve, reject) => {
    crypto.randomBytes(8, (err, raw) =>{
      if(err){
        reject(err)
        return;
      }
      resolve(raw.toString('hex'))
    })
  })
}

module.exports = {
  bind: (fpm) => {

    const _wsServer = { ref: undefined, callbacks: {}, clients: {} };

    const bizModule = {
      send: async args => {
        debug('[broadcast]: args %O', args);
        const { id, payload } = args;
        try {
          assert(!!id, 'Id required');
          assert(!!payload, 'payload required');
          const { ref, clients } = _wsServer;
          assert(!!ref, 'Websocket Server not running');
          const wsClient = clients[id];
          assert(!!wsClient, `The client of the id: ${id} lost connection!`)
          return new Promise(( resolve, reject ) => {
            wsClient.send(payload, err => {
              if(err){
                reject({
                  message: err.message
                })
                return;
              }
              resolve(1)
            })
          })
        } catch (error) {
          return Promise.reject({
            message: error.message,
          })
        }
      },
      broadcast: async args => {
        debug('[broadcast]: args %O', args);
        const { payload } = args;
        try {
          assert(!!payload, 'payload required');
          const { ref, clients } = _wsServer;
          assert(!!ref, 'Websocket Server not running');
          _.map(clients, client => {
            client.send(payload, err => {
              fpm.logger.error(err);
            });
          });
          return _.size(clients);
        } catch (error) {
          return Promise.reject({
            message: error.message,
          })
        }
      }
    };

    const onConnectedHandler = async ws => {
      try {
        debug('new client connection')
        const uid = await generUid()
          
        _wsServer.clients[uid] = ws;
        ws.id = uid;
        fpm.publish('#ws/connect', uid)

        ws.on('message', message => {
          debug('on receive %O from %s', message, ws.id)
          fpm.publish('#ws/receive', { id: ws.id, payload: message });
        })

        ws.on('close', () => {
          debug('on close %O, from %s', ws.id);
          fpm.publish('#ws/close', ws.id);
        })
      } catch (error) {
        debug('Error %O', error)
      }
      
    }
    // Run When Server Init
    fpm.registerAction('INIT', () => {
      const c = fpm.getConfig('ws', {
        port: 10100
      });
      debug('%o', c);
      const wss = _wsServer.ref = new WebSocketServer(c);
      wss.on('connection', onConnectedHandler);

    })

    fpm.registerAction('BEFORE_SERVER_START', () => {
      fpm.extendModule('ws', bizModule);
    })
    return bizModule;
  }
}
