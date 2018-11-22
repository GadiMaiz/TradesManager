import { orderTypes, Notifications } from 'smart-trader-common';
import { Module } from './moduleInfo';
import { TraderStatus } from './TraderStatus';
import getEventQueue from 'eventQueue';
import logger from 'logger';



class TraderNotificationManager {

  constructor() {
    this.openOrders = {};
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
        this.handleMakeOrder(params);
        break;
      case  TraderStatus.makeOrderFinished:
        this.handleFinished(params);
        break;
      case  TraderStatus.makeOrderExecuted:
        this.handleMakeOrderExecuted(params);
        break;

    }
  }

  handleFinished(params) {
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
    }
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
    logger.debug('order id %s was finished, size = %o, price = %o', params.internalOrderId,params.size, params.price);
  }

  handleCancelled(params) {
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
        // errorCode     : err.statusCode,
        // errorMessage  : err.message
        });
      logger.debug('order id %s was cancelled', params.internalOrderId );

      this.openOrders.delete(params.tradeOrderId);
    }
  }


  handleMakeOrder(params) {
    console.log('params = %o' , params );
    this.openOrders[params.tradeOrderId] = true;
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
      // errorCode     : err.statusCode,
      // errorMessage  : err.message
      });
  }

  handleMakeOrderExecuted(params) {
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

module.exports = TraderNotificationManager;