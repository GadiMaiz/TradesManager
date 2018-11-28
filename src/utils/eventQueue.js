const kafka = require('kafka-node');
import logger from 'logger';
import { Status, returnMessages } from 'status';
import moment from 'moment';
import { Module } from 'moduleInfo';

const PARTITION = 0;
let NotificationsTopic = null;
let BalancesTopic = null;

let KeyedMessage = kafka.KeyedMessage;
class EventQueue {
  constructor(params, cb) {
    let execute = cb;
    this.shouldWriteAllTrades = params.shouldWriteAllTrades;
    NotificationsTopic = params.notificationsTopic;
    BalancesTopic = params.balancesTopic;
    // ////// notifications producer initialization

    this.client = new kafka.Client(params.kafkaZookeeperUrl +  ':'  + params.kafkaZookeeperPort);
    this.client2 = new kafka.Client(params.kafkaZookeeperUrl + ':' + params.kafkaZookeeperPort);
    this.notificationProducer = new kafka.Producer(this.client);

    this.notificationProducer.on('ready', function () {
      this.client.refreshMetadata([NotificationsTopic], (err) => {
        if (err) {
          console.warn('Error refreshing kafka metadata', err);
        }
      });
    });

    this.notificationProducer.on('error', function (err) {
      console.log('error', err);
    });


    this.tradesProducer = new kafka.Producer(this.client);




    this.balanceProducer = new kafka.Producer(this.client2);

    this.balanceProducer.on('ready', function () {
      this.client.refreshMetadata([BalancesTopic], (err) => {
        if (err) {
          console.warn('Error refreshing kafka metadata', err);
        }
      });
    });

    this.balanceProducer.on('error', function (err) {
      console.log('error', err);
    });


    // order requests consumer initilization

    // this.topics = [{ topic: params.ordersTopic, partition: 0 }];
    this.topics = [{ topic: params.ordersTopic, partition: 0 }, { topic: params.depositTopic, partition: 0 }];
    this.options = { autoCommit: true, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024 };
    this.consumer = new kafka.Consumer(this.client, this.topics, this.options);
    this.offset = new kafka.Offset(this.client);

    this.consumer.on('message', function (message) {
      execute(message);
    });

    this.consumer.on('error', function (err) {
      logger.error('Kafka experienced an error - %s', err);
    });
  }

  sendNotification(notificationType, parameters) {
    parameters['eventTimeStamp'] = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    parameters['sendingModule'] = Module.name;
    const keyedMessage = new KeyedMessage(notificationType, JSON.stringify(parameters));
    this.notificationProducer.send([{ topic:  NotificationsTopic, partition: PARTITION, messages: [keyedMessage] }], function (err, result) {
      if (err) {
        logger.error(err);
      }
      else {
        logger.info('%o', result);
      }
    });
  }

  sendBalance(account, parameters) {
    const keyedMessage = new KeyedMessage(account, JSON.stringify(parameters));
    this.balanceProducer.send([{ topic: BalancesTopic, partition: PARTITION, messages: [keyedMessage] }], function (err, result) {
      if (err) {
        logger.error(err);
      }
      else {
        logger.info('%o', result);
      }
    });
  }

}

let eventQueue;

const getInstance = (params, cb) => {
  if (!eventQueue) {
    if (!cb || !params) {
      throw { status: Status.Error, message: returnMessages.EventQueueInitFailed };
    }
    eventQueue = new EventQueue(params, cb);
  }
  return eventQueue;
};

module.exports = getInstance;