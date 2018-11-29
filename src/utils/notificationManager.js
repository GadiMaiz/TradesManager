import { orderTypes, Notifications } from 'smart-trader-common';
import { Module } from './moduleInfo';
import { TraderStatus } from './TraderStatus';
import getEventQueue from 'eventQueue';
import logger from 'logger';
// import OrderExecuter from 'src/server/modules/orderExecuter';



class TraderNotificationManager {

  constructor(orderExecuter) {
    this.openOrders = {};
    this.orderExecuter = orderExecuter;
  }

  notify(params) {
    switch(params.status) {
      case TraderStatus.finished:
        this.handleFinished(params);
        break;
      case TraderStatus.cancelled:
        this.handleCancelled(params);
        break;
      case  TraderStatus.makeOrder:
      case  TraderStatus.takeOrder:
        this.handleNewOrder(params);
        break;
      case  TraderStatus.makeOrderExecuted:
        this.handleMakeOrderExecuted(params);
        break;

    }
  }

  handleFinished(params) {
    logger.info('GADI handleFinished -> %o', params);
    if (!this.orderExecuter.orderWasCancelled(params)) {
      this.orderExecuter.orderWasExecuted(params);

      getEventQueue().sendNotification(Notifications.Update,
        {
          requestId     : params.internalOrderId,
          exchanges     : [params.exchange.toLowerCase()],
          size          : params.size,
          price         : params.price,
          ask           : params.ask,
          bid           : params.bid,
          currencyFrom  : params.currencyFromAvailable,
          currencyTo    : params.currencyToAvailable,
          sendingModule : Module.name,
          exchangeOrderId : params.exchangeOrderId,
          userId          : params.userId,
          actionType      : 'take'
        });

      const retVal = this.orderExecuter.orderWasFinished(params);

      if (retVal) {
        logger.info('GADI handleFinished ---->  if (retVal), retVal = %o', retVal);
        getEventQueue().sendNotification(Notifications.Finished,
          {
            requestId     : params.internalOrderId,
            exchanges     : [params.exchange.toLowerCase()],
            size          : retVal.size,
            price         : retVal.price,
            ask           : params.ask,
            bid           : params.bid,
            currencyFrom  : params.currencyFromAvailable,
            currencyTo    : params.currencyToAvailable,
            sendingModule : Module.name,
            exchangeOrderId : params.exchangeOrderId,
            userId          : params.userId
          });
        logger.debug('order id %s was finished', params.internalOrderId );
      }
      else {
        logger.info('GADI handleFinished ---->  if (!retVal)');

      }
    }
  }

  handleCancelled(params) {
    if (!this.orderExecuter.orderWasCancelled(params)) {
      if (params.parentOrderId === -1 || this.openOrders[params.tradeOrderId]) {

        getEventQueue().sendNotification(Notifications.Cancelled,
          {
            requestId     : params.internalOrderId,
            exchanges     : [params.exchange.toLowerCase()],
            size          : params.size,
            price         : params.price,
            ask           : params.ask,
            bid           : params.bid,
            currencyFrom  : params.currencyFromAvailable,
            currencyTo    : params.currencyToAvailable,
            sendingModule : Module.name,
            exchangeOrderId : params.exchangeOrderId,
            userId          : params.userId
          });
        logger.debug('order id %s was cancelled', params.internalOrderId );

        delete this.openOrders[params.tradeOrderId];
      }
    }
    else{
      getEventQueue().sendNotification(Notifications.Cancelled,
        {
          requestId     : params.internalOrderId,
          exchanges     : [params.exchange.toLowerCase()],
          size          : params.size,
          price         : params.price,
          ask           : params.ask,
          bid           : params.bid,
          currencyFrom  : params.currencyFromAvailable,
          currencyTo    : params.currencyToAvailable,
          sendingModule : Module.name,
          exchangeOrderId : params.exchangeOrderId,
          userId          : params.userId
        });
    }
  }


  handleNewOrder(params) {
    this.openOrders[params.tradeOrderId] = true;
    this.orderExecuter.newOrderWasReceived(params);
    getEventQueue().sendNotification(Notifications.ReceivedOnTrader,
      {
        requestId     : params.internalOrderId,
        exchanges     : [params.exchange.toLowerCase()],
        size          : params.size,
        price         : params.price,
        ask           : params.ask,
        bid           : params.bid,
        currencyFrom  : params.currencyFromAvailable,
        currencyTo    : params.currencyToAvailable,
        sendingModule : Module.name,
        exchangeOrderId : params.exchangeOrderId,
        userId          : params.userId
      });
  }

  handleMakeOrderExecuted(params) {
    logger.info('GADI handleMakeOrderExecuted -> %o', params);
    this.orderExecuter.orderWasExecuted(params);
    getEventQueue().sendNotification(Notifications.Update,
      {
        requestId     : params.internalOrderId,
        exchanges     : [params.exchange.toLowerCase()],
        size          : params.size,
        price         : params.price,
        ask           : params.ask,
        bid           : params.bid,
        currencyFrom  : params.currencyFromAvailable,
        currencyTo    : params.currencyToAvailable,
        sendingModule : Module.name,
        exchangeOrderId : params.exchangeOrderId,
        userId          : params.userId,
        actionType      : 'take'
      // errorCode     : err.statusCode,
      // errorMessage  : err.message
      });
  }
}

let notificationManager;

const getNotificationManager = (orderExecuter) => {
  if (!notificationManager) {
    notificationManager = new TraderNotificationManager(orderExecuter);
  }
  return notificationManager;
};

export default getNotificationManager;