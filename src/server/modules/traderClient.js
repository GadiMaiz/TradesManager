import { Client } from 'node-rest-client';


class TraderClient {

  constructor(params) {
    this.restClient = new Client();
    this.url = params.url;

  }


  /**
  *
  * @param {object} params            - all parameters that is being sent to the trader
  * @param {number} params.size       - the size to trade
  * @param {string} params.assetPair  - the pair to trade
  * @param {} params.actionType       - sell/buy/sell_limit/buy_limit
  * @param {} params.exchanges        - the exchanges to trade in
  * @param {} params.price            - what is the limit price for the order
  * @param {} params.requestId        - generated requestId
  * @param {} params.account          - account id
  * @param {} params.durationSec      - how long will it take to trade all of the money
  * @param {} params.maxOrderSize     - the largest size that will be sent to exchange per single trade
  *
  * @param {function} cb - being called after rest request returned with the returned data
  */
  sendOrderRequest(params, cb) {
    let args = {
      data: {
        'size'              : params.size,
        'assetPair'         : params.assetPair,
        'actionType'        : params.actionType,
        'exchanges'         : params.exchanges,
        'price'             : params.price,
        'externalOrderId'   : params.requestId,
        'userId'            : params.account,
        'durationSec'       : params.durationSec,
        'maxOrderSize'      : params.maxOrderSize,
        'maxExchangeSizes'  : params.maxExchangeSizes },
      headers: { 'Content-Type': 'application/json' }
    };
    let url = `${this.url}/sendOrder?account=${params.account}`;
    this.restClient.post(url, args, function (data, response) {
      cb(data);
    });
  }

  sendCancelRequest(account, orderId, cb) {
    this.restClient.get(`${this.url}/CancelTimedOrder?account=${account}&externalOrderId=${orderId}`, {}, function (data, response) {
      cb(data);
    });
  }

  getAccountBalanceFromExchange(account, exchange) {
    let url = `${this.url}/exchange/${exchange}/AccountBalance/?account=${account}`;
    this.restClient.get(url, function (data, response) {
    });
  }

  getAccountBalanceAll(account, cb) {
    let url = `${this.url}/AccountBalance?account=${account}`;
    this.restClient.get(url, function (data, response) {
      cb(data , account);
    });
  }

  getTimedOrderStatus(account,orderId, cb) {
    let url = `${this.url}/GetTimedOrderStatus?account=${account}&externalOrderId=${orderId}`;
    this.restClient.get(url, function (data, response) {
      cb(data);
    });
  }


  login(params) {
    let exchange = params.exchange.charAt(0).toUpperCase() + params.exchange.slice(1);
    let url = `${this.url}/exchange/${exchange}/login?account=${params.account}`;
    let args = {
      data: {
        'username' : params.username,
        'key'      : params.key,
        'secret'   : params.secret,
      },
      headers: { 'Content-Type': 'application/json' }
    };
    this.restClient.post(url, args, function (data, response) {
    });

  }

}


module.exports = TraderClient;



