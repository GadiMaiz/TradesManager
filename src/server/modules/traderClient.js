import { Client } from 'node-rest-client';


class TraderClient {

  constructor() {
    this.restClient = new Client();

  }

  sendOrderRequest(params, cb) {
    let args = {
      data: {
        'size'              : params.size,
        'assetPair'         : params.currencyPair,
        'actionType'        : params.actionType,
        'exchanges'         : params.exchanges,
        'price'             : params.price,
        'externalOrderId'   : params.requestId,
        'userId'            : params.account,
        'durationSec'       : params.durationSec,
        'maxOrderSize'      : params.maxOrderSize },
      headers: { 'Content-Type': 'application/json' }
    };
    let url = `http://localhost:5000/sendOrder?account=${params.account}`;
    this.restClient.post(url, args, function (data, response) {
      cb(data);
    });
  }

  sendCancelRequest(params) {
    this.restClient.post('http://localhost:5000/CancelTimedOrder?account=XXXXXXXXXXXXXXXXXX', args, function (data, response) {
      console.log(data.toString());
    });
  }

  getAccountBalanceFromExchange(account, exchange) {
    let url = `http://localhost:5000/exchange/${exchange}/AccountBalance/?account=${account}`;
    this.restClient.get(url, function (data, response) {
      console.log(data.toString());
    });
  }

  getAccountBalanceAll(account, cb) {
    let url = `http://localhost:5000/AccountBalance?account=${account}`;
    this.restClient.get(url, function (data, response) {
      // console.log(JSON.stringify(data.Bitstamp.balances.BCH));
      cb(data , account);
    });
  }

  login(params) {
    let exchange = params.exchange.charAt(0).toUpperCase() + params.exchange.slice(1);
    let url = `http://localhost:5000/exchange/${exchange}/login?account=${params.account}`;
    let args = {
      data: {
        'username' : params.username,
        'key'      : params.key,
        'secret'   : params.secret,
      },
      headers: { 'Content-Type': 'application/json' }
    };
    this.restClient.post(url, args, function (data, response) {
      console.log(JSON.stringify(data));
    });

  }

}


module.exports = TraderClient;



