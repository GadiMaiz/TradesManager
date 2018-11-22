import http from 'http';
import nodeConfigModule from 'node-config-module';
// Set process name
process.title = ['Trades-Manager']; 

import Server from 'server';

/**
 * Create HTTP server.
 */

const defaultConf = {};
nodeConfigModule.init(defaultConf, null, ()=>{});
let conf = nodeConfigModule.getConfig();

const serverApp = new Server(conf);

const server = http.createServer(serverApp.getServer()).listen(3002);
export default server;
