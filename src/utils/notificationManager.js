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
        // console.log('NOTIFY = %o', params);
        this.handleFinished(params);
        break;
      case TraderStatus.cancelled:
        this.handleCancelled(params);
        break;
      case  TraderStatus.makeOrder:
      case  TraderStatus.takeOrder:
        // console.log('NOTIFY = %o', params);
        this.handleNewOrder(params);
        break;
      case  TraderStatus.makeOrderExecuted:
        console.log('NOTIFY = %o', params);
        this.handleMakeOrderExecuted(params);
        break;

    }
  }

  handleFinished(params) {
    if (!this.orderExecuter.orderWasCancelled(params)) {
      if (params.parentOrderId === -1) {
        getEventQueue().sendNotification(Notifications.Finished,
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

        logger.debug('order id %s was finished', params.internalOrderId );
        this.orderExecuter.orderWasFinished(params);
      }

      else{
        console.log('XXXXXXXXXXXXXXXXXXXXXXX - 2 params = %o', params);
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
            userId          : params.userId
          });
      }
      logger.debug('order id %s was finished, size = %o, price = %o', params.internalOrderId,params.size, params.price);
    }
  }

  handleCancelled(params) {
    if (!this.orderExecuter.orderWasCancelled(params)) {
      if (params.parentOrderId === -1 || this.openOrders[params.tradeOrderId]) {

        console.log(JSON.stringify(params));
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
      // console.log('NOTIFY = %o', params);
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
    console.log('XXXXXXXXXXXXXXXXXXXXXXX - 1 prarams = %o', params);
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
        userId          : params.userId
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