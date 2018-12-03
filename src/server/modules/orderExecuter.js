import { orderTypes, Notifications } from 'smart-trader-common';
import { Status, returnMessages } from 'status';
import logger from 'logger';
import TraderClient from './traderClient';
import CredentialsManager from 'credentialsManager';
import BalanceManager from  '../../utils/balanceManager';
import isReachable from 'is-reachable';

const getEventQueue = require('eventQueue');






class OrderExecuter {

  constructor(params) {
    this.traderClient = new TraderClient(params);
    this.balanceManager = new BalanceManager();
    this.orders = {};
    this.killList = {};
    this.thresholdPercent = params.makeToTakeThresholdPercent;
    this.credentialsManager = new CredentialsManager(params.credentialsFilePath);

    this.waitForEndpoint(`${params.url}/AccountBalance?account=tmp`);

  }

  waitForEndpoint(url) {
    isReachable(url).then(ans => {
      if (ans === false) {
        logger.warn(`${url} is not reachable, will retry in 5000 milisec`);
        setTimeout(this.waitForEndpoint.bind(this), 5000, url);
      }
      else {
        logger.debug(`${url} was reached, initializing all accounts`);
        const allCredentials = this.credentialsManager.getAllCredentials();

        Object.keys(allCredentials).forEach((account) => {
          Object.keys(allCredentials[account]).forEach((exchange) => {
            let credentials = allCredentials[account][exchange];
            this.traderClient.login({ exchange : exchange,
              account : account,
              username: credentials.clientId,
              key :     credentials.key,
              secret : credentials.secret });

            this.traderClient.getAccountBalanceAll(account, (data, userId) => { this.balanceManager.updateAllBalance(data, userId)
              .then(getEventQueue().sendBalance(account, this.balanceManager.getAccountBalance(account))) ; });
          });
        });
      }
    });
  }

  orderWasFinished(params) {
    logger.debug(`currentSizeToTrade = ${this.orders[params.internalOrderId].currentSizeToTrade} , size still needs to be deposited =  ${this.orders[params.internalOrderId].sizeLeftToDeposit}`);
    if (this.orders[params.internalOrderId].currentSizeToTrade == 0 &&  this.orders[params.internalOrderId].sizeLeftToDeposit == 0) {
      logger.debug(`order ${params.internalOrderId} was finished`);
      let i = 0;
      let retVal = { size: 0, price:0 };
      for (i = 0; i < this.orders[params.internalOrderId].trades.length; ++i) {
        const size = this.orders[params.internalOrderId].trades[i].size;
        retVal.size = Number((retVal.size + size).toPrecision(6));
        retVal.price = Number((retVal.price + (this.orders[params.internalOrderId].trades[i].price * size)).toPrecision(6));
      }
      retVal.price = Number((retVal.price / retVal.size).toPrecision(6));
      logger.info('trade %s, was finished, size traded = %o, average price = ', params.internalOrderId, retVal.size,  retVal.price);
      delete this.orders[params.internalOrderId];
      return retVal;

    }
    return null;


  }


  // /**
  //  * the function accept order object and executes the order requested
  //  * @param {object} order
  //  * @param {string} order.topic - topic name the client listens to (deposit of order)
  //  * @param {string} order.key - a numeric string that defined in orderTypes.js and represent the order type
  //  * @param {object} order.value - a json object that contains all the parameters for the order request
  //  */
  execute(order) {
    const parameters = JSON.parse(order.value);

    if (order.topic === 'deposit') {
      console.log('deposit');
      this.update(order.key, parameters);
    }
    else{
      getEventQueue().sendNotification(Notifications.ReceivedFromEventQueue,
        {
          requestId: parameters.requestId,
          exchange: parameters.exchange,
          size : parameters.size,
          price : parameters.price,
          exchanges: parameters.exchanges
        });
      // first letter of exchange name should be capital
      if (parameters.exchanges) {
        let i = 0;
        for (i = 0; i < parameters.exchanges.length; ++i) {
          parameters.exchanges[i] =  parameters.exchanges[i].charAt(0).toUpperCase() + parameters.exchanges[i].slice(1);
        }
      }
      switch (Number(order.key)) {
        case (orderTypes.getUserData):
          logger.debug('getUserData request received');
          this.getUserData(parameters);
          break;
        case (orderTypes.login):
          logger.debug('login request received');
          this.login(parameters);
          break;
        case (orderTypes.prepareForTrade):
          this.start(parameters);
          console.log('orders');
          break;

      }
    }
  }


  /**
   * login calls the login function of the handler
   * @param {object} params
   * @param {object} params.key      - part of the credentials
   * @param {object} params.secret   - part of the credentials
   * @param {object} params.clientId - part of the credentials
   * @param {object} params.requestId- identifier for the request
   * @param {object} params.exchange - the exchange name the order addressed to
   */
  async login(params) {
    const exchange = params.exchange.toLowerCase();
    const key = params.key;
    const secret = params.secret;
    const clientId = params.clientId;
    const requestId = params.requestId;

    try {
      await this.handler.login(exchange, { key, secret, clientId, requestId });
      getEventQueue().sendNotification(Notifications.SuccessfullyLoggedInToExchange, { requestId: requestId, exchange: exchange });
      logger.debug('successfully logged in to exchange- %s requestId- %s', exchange, requestId);
    }
    catch (err) {
      getEventQueue().sendNotification(Notifications.Error, { requestId: requestId, exchange: exchange, errorMessage: 'cant login, possibly wrong credentials' });
      logger.error('unable to login to %s exchange, err = %s requestId = %s' , exchange, err, requestId);
    }
  }

  /**
   * calls the getUserData function of the handler
   * @param {object} params
   * @param {object} params.exchange - the exchange name the order addressed to
   */
  async getUserData(params) {
    const exchange = params.exchange.toLowerCase();
    if (!exchange) {
      const err = new Error(returnMessages.InputParametersMissing);
      logger.error(err);
    }
    const requestId = params.requestId;
    const userId = params.userId;
    try {
      const userData = await this.handler.getUserAccountData(exchange, requestId, userId);
      getEventQueue().sendNotification(Notifications.Success, { requestId: requestId, data: userData, exchange: exchange });
      logger.debug('successfully sent get user data request requestId = %s', requestId);
    }
    catch (err) {
      getEventQueue().sendNotification(Notifications.Error, { requestId: requestId, exchange: exchange, errorCode: err.statusCode, errorMessage: err.message });
      logger.error('getUserData encountered an error : %o', err);
    }
  }


  update(exchange, params) {
    logger.debug('update request was received with parameters = %o', params);
    getEventQueue().sendNotification(Notifications.depositRequestReceived, {
      requestId: params.requestId,
      exchanges: [params.exchange.toLowerCase()],
      size : params.size });

    const order = this.orders[params.requestId];
    if (!order) {
      console.error('could not find %o', params.requestId);
      return;
    }
    if (!this.orders[params.requestId]['startTime']) {
      this.orders[params.requestId]['startTime'] = Date.now();
    }

    if (params.size) {
      this.orders[params.requestId]['currentSizeToTrade'] =  Number((this.orders[params.requestId]['currentSizeToTrade'] + params.size).toPrecision(6));
      this.orders[params.requestId]['sizeLeftToDeposit'] = Number((this.orders[params.requestId]['sizeLeftToDeposit'] - params.size).toPrecision(6));
      if (! this.orders[params.requestId]['maxExchangeSizes'][params.exchange])
      {
        this.orders[params.requestId]['maxExchangeSizes'][params.exchange]  = 0;
      }
      this.orders[params.requestId]['maxExchangeSizes'][params.exchange]  = Number((this.orders[params.requestId]['maxExchangeSizes'][params.exchange] + params.size).toPrecision(6));
    }

    logger.info(`order ${params.requestId} was updated, canceling all related requests and executing new ones`);

    if (order.activeOrder) {
      this.traderClient.sendCancelRequest(order.account, params.requestId, (data) => {
        params['exchange'] = exchange;
        if (data.cancel_time_order_result === 'False') {
          this.generateOrder(params);
        }
        else{
          this.killList[params.requestId] = params;
        }
      });

    }
    else{
      this.generateOrder(params);
    }
  }

  orderWasCancelled(params) {
    if (this.killList[params.internalOrderId]) {
      if  (this.orders[params.internalOrderId]['tradeOrderId'] === params.tradeOrderId) {
        logger.debug('order id %o, was cancelled , generating new request',params.internalOrderId);
        let order = this.killList[params.internalOrderId];
        this.generateOrder(order);
        delete this.killList[params.internalOrderId];
        return true;
      }
    }
    return false;
  }

  generateOrder(params) {
    this.orders[params.requestId]['activeOrder'] = true;
    this.generateAndSendOrder(this.orders[params.requestId]);
  }

  generateAndSendOrder(order) {
    order['durationSec'] = order.overallDurationSec - ( (Date.now() - order.startTime) / 1000) ;
    if(order['durationSec'] < 0) {
      logger.warn('the requested time finished, executing the order with duration = 1 sec');
      order['durationSec'] = 1;
    }
    order['maxOrderSize'] = Math.max((order.currentSizeToTrade < 0.2 ? 0.02 : 0.2), order.currentSizeToTrade / 100);

    if (order.typeOfTrade === 'make') {
      logger.info('about to send make order request, order details %o', order);
      this.timedRequestMaking(order);
    }
    else if (order.typeOfTrade === 'take') {
      logger.info('about to send take order request, order details %o', order);
      this.timedRequestTaking(order);
    }
    else {
      logger.error(`cant generate new request action: ${order.action} is unknown`);
    }
  }

  start(params) {
    params['durationSec'] = Number(params.durationMinutes) * 60;
    if ( !this.orders[params.requestId] ) {
      this.orders[params.requestId] = {
        account                : params.account,
        exchanges              : params.exchanges,
        actionType             : params.actionType,
        sizeLeftToDeposit      : params.size,
        assetPair              : params.assetPair,
        price                  : params.price,
        overallDurationSec     : params.durationSec,
        currentSizeToTrade     : 0,
        maxExchangeSizes       : {},
        typeOfTrade            : 'make',
        activeOrder            : false,
        requestId              : params.requestId
      };

      let i = 0;
      for (i = 0; i < this.orders[params.requestId].exchanges.length; ++i) {
        this.orders[params.requestId].maxExchangeSizes[this.orders[params.requestId].exchanges[i]] = 0;
      }

      const timeToChange = params.durationSec * this.thresholdPercent * 10;
      logger.debug(`action type will be changed in ${timeToChange}`);
      setTimeout(() => { this.updateActionType(params.requestId) ; },timeToChange );
    }
    else{
      logger.error('%o transaction already requested',  params.requestId);
    }
  }

  updateActionType(requestId) {
    logger.info(`order ${requestId} changed from make to take` );

    this.orders[requestId]['typeOfTrade'] = 'take';
    if (this.orders[requestId].activeOrder) {
      this.update(null, { requestId: requestId });
    }
  }


  async ImmediateOrCancelRequest(params) {
    params['size'] = params.currentSizeToTrade;
    const price = params.price;
    let tradedPair = params.assetPair.split('-');

    // set content-type header and data as json in args parameter
    const pair = this.balanceManager.getBalance(tradedPair, params.account);


    if (!params.size || !price || !params.exchanges || !params.requestId || !params.assetPair) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          exchanges: params.exchanges,
          errorCode: Status.InputParametersMissing,
          errorMessage: returnMessages.InputParametersMissing,
          currencyFrom: pair[0],
          currencyTo: pair[1],
        });
      logger.error('some of the input parameters are missing (size, price, exchanges, requestId, assetPair)');
      return;
    }
    params['durationSec'] = 0;
    params['maxOrderSize'] = 0;
    this.traderClient.sendOrderRequest(params, (data) => {
      if (data.order_status == 'False') {
        getEventQueue().sendNotification(Notifications.Error,
          {
            requestId: params.requestId,
            errorCode: Status.Error,
            errorMessage: 'IOC request failed',
            exchanges: params.exchanges,
            currencyFrom: pair[0],
            currencyTo: pair[1]
          });
      }
      else{
        logger.debug('successfully executed %s request requestId = %s', params.actionType, params.requestId);
      }
    });
  }

  async timedRequestMaking(params) {
    params['size'] = params.currentSizeToTrade;
    const price = params.price;
    if (params.actionType.split('_').length === 1) {
      params.actionType += '_limit';
    }
    let tradedPair = params.assetPair.split('-');

    let pair = this.balanceManager.getBalance(tradedPair, params.account);
    if (!params.size || !price || !params.exchanges || !params.requestId || !params.assetPair || !params.durationSec) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          statusCode: Status.InputParametersMissing,
          returnMessage: returnMessages.InputParametersMissing,
          exchanges: params.exchanges,
          currencyFrom: pair[0],
          currencyTo: pair[1]
        });
      logger.error('some of the input parameters are missing (size, price, exchange, requestId, durationSec)');
      return;
    }
    this.traderClient.sendOrderRequest(params, (data) => {
      if (data.order_status == 'False') {
        logger.error('timed request failed , %o', data);
        getEventQueue().sendNotification(Notifications.Error,
          {
            requestId: params.requestId,
            errorCode: Status.Error,
            errorMessage: data.execution_message,
            exchanges: params.exchanges,
            currencyFrom: pair[0],
            currencyTo: pair[1]
          });
      }
      else{
        logger.debug(JSON.stringify(data));
        logger.debug('successfully executed %s request requestId = %s', params.actionType, params.requestId);
      }
    });
  }

  async timedRequestTaking(params) {

    if (params.actionType.split('_').length !== 1) {
      params.actionType = params.actionType.split('_')[0];
    }
    params['size'] =  params.currentSizeToTrade;
    const price = params.price;
    let tradedPair = params.assetPair.split('-');

    let pair = this.balanceManager.getBalance(tradedPair, params.account);

    if (!params.size || !price || !params.exchanges || !params.requestId || !params.assetPair || !params.durationSec) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          statusCode: Status.InputParametersMissing,
          returnMessage: returnMessages.InputParametersMissing,
          exchanges: params.exchanges,
          currencyFrom: pair[0],
          currencyTo: pair[1]
        });
      logger.error('some of the input parameters are missing (size, price, exchange, requestId, durationSec)');
      return;
    }
    this.traderClient.sendOrderRequest(params, (data) => {
      if (data.order_status == 'False') {
        getEventQueue().sendNotification(Notifications.Error,
          {
            requestId: params.requestId,
            errorCode: Status.Error,
            errorMessage: 'Timed take request failed',
            exchanges: params.exchanges,
            currencyFrom: pair[0],
            currencyTo: pair[1]
          });
      }
      else{
        logger.debug(JSON.stringify(data));
        logger.debug('successfully executed %s request requestId = %s', params.actionType, params.requestId);
      }
    });

  }

  newOrderWasReceived(params) {
    this.orders[params.internalOrderId]['tradeOrderId'] = params.tradeOrderId;
  }

  orderWasExecuted(params) {
    if (!this.orders[params.internalOrderId]['trades']) {
      this.orders[params.internalOrderId]['trades'] = [];
    }
    this.orders[params.internalOrderId]['trades'].push( { 'size': params.size , 'price': params.price } );

    this.orders[params.internalOrderId]['maxExchangeSizes'][params.exchange] = Number((this.orders[params.internalOrderId]['maxExchangeSizes'][params.exchange] - params.size).toPrecision(6));
    this.orders[params.internalOrderId]['currentSizeToTrade'] = Number((this.orders[params.internalOrderId]['currentSizeToTrade'] - params.size).toPrecision(6));
    logger.info(`currentSizeToTrade ${this.orders[params.internalOrderId]['currentSizeToTrade']}`);
    if(this.orders[params.internalOrderId]['currentSizeToTrade'] === 0) {
      this.orders[params.internalOrderId].activeOrder = false;
    }
  }
}



export default OrderExecuter;