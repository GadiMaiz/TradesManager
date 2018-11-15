import log from 'logger';
import CassandraProducer from 'archiver/cassandraProducer';

export default class ArchiverService {

  constructor(config) {
    this.cassandraProducer = new CassandraProducer(config.DB);
  }

  backup(config) {
    log.info('Starting backup');
    let schedule = require('node-schedule');

    let j = schedule.scheduleJob('*/1 * * * *', function() {
      console.log('The answer to life, the universe, and everything!');
      let cassandraProducer = new CassandraProducer(config.DB);
      cassandraProducer.backup();
    });


  }
}