import { orderTypes, Notifications } from 'smart-trader-common';
import { Status, returnMessages } from 'status';
import logger from 'logger';
import TraderClient from './traderClient';
import CredentialsManager from 'credentialsManager';
import BalanceManager from  '../../utils/balanceManager';

const getEventQueue = require('eventQueue');






class OrderExecuter {

  constructor(params) {
    this.traderClient = new TraderClient();
    this.balanceManager = new BalanceManager();
    let credentialsManager = new CredentialsManager(params.credentialsFilePath);


    const allCredentials = credentialsManager.getAllCredentials();
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

  /**
   * the function accept order object and executes the order requested
   * @param {object} order
   * @param {string} order.key - a numeric string that defined in orderTypes.js and represent the order type
   * @param {object} order.value - a json object that contains all the parameters for the order request
   */
  execute(order) {
    const parameters = JSON.parse(order.value);
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
      case (orderTypes.login): {
        logger.debug('login request received');
        this.login(parameters);
        break;
      }
      case (orderTypes.ImmediateOrCancel):
        logger.debug('%s ImmediateOrCancel request received',parameters.actionType);
        this.ImmediateOrCancelRequest(parameters);
        break;
      case (orderTypes.timedTaking):
        logger.debug('%s timedTaking request received', parameters.actionType);
        break;
      case (orderTypes.timedMaking):
        logger.debug('%s timedMaking request received', parameters.actionType);
        this.timedRequestMaking(parameters);
        break;
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


  async ImmediateOrCancelRequest(params) {
    const size = params.size;
    // const exchange = params.exchange.toLowerCase();
    const price = params.price;
    let tradedPair = params.currencyPair.split('-');

    // set content-type header and data as json in args parameter
    const pair = this.balanceManager.getBalance(tradedPair, params.account);


    if (!size || !price || !params.exchanges || !params.requestId || !params.currencyPair) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          exchanges: params.exchanges,
          errorCode: Status.InputParametersMissing,
          errorMessage: returnMessages.InputParametersMissing,
          currencyFrom: pair[0],
          currencyTo: pair[1],
        });
      logger.error('some of the input parameters are missing (size, price, exchange, requestId, currencyPair)');
      return;
    }
    let retVal = null;
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
    // const exchange = params.exchange.toLowerCase();

    const size = params.size;
    const price = params.price;
    params.actionType += '_limit';
    let tradedPair = params.currencyPair.split('-');

    let pair = this.balanceManager.getBalance(tradedPair, params.account);

    if (!size || !price || !params.exchanges || !params.requestId || !params.currencyPair || !params.durationMinutes) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          statusCode: Status.InputParametersMissing,
          returnMessage: returnMessages.InputParametersMissing,
          exchanges: params.exchanges,
          currencyFrom: pair[0],
          currencyTo: pair[1]
        });
      logger.error('some of the input parameters are missing (size, price, exchange, requestId, durationMinutes)');
      return;
    }
    params['durationSec'] =  Number(params.durationMinutes) * 60;
    this.traderClient.sendOrderRequest(params, (data) => { 3;
      console.log('data = %o',  JSON.stringify(data));
      if (data.order_status == 'False') {
        getEventQueue().sendNotification(Notifications.Error,
          {
            requestId: params.requestId,
            errorCode: Status.Error,
            errorMessage: 'Timed make request failed',
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

  async timedRequestTaking(params) {

    const size = params.size;
    const price = params.price;
    let tradedPair = params.currencyPair.split('-');

    let pair = this.balanceManager.getBalance(tradedPair, params.account);

    if (!size || !price || !params.exchanges || !params.requestId || !params.currencyPair || !params.durationMinutes) {
      getEventQueue().sendNotification(Notifications.Error,
        {
          requestId: params.requestId,
          statusCode: Status.InputParametersMissing,
          returnMessage: returnMessages.InputParametersMissing,
          exchanges: params.exchanges,
          currencyFrom: pair[0],
          currencyTo: pair[1]
        });
      logger.error('some of the input parameters are missing (size, price, exchange, requestId)');
      return;
    }
    params['durationSec'] =  Number(params.durationMinutes) * 60;
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
        logger.debug('successfully executed %s request requestId = %s', params.actionType, params.requestId);
      }
    });
  }

}



export default OrderExecuter;