import * as cassandra from 'cassandra-driver';
import log from 'logger';
import * as _ from 'lodash';
import fs from 'fs';
import csvWriter from 'csv-write-stream';

export default class CassandraProducer {

  constructor(config) {
    try {
      this.keyspace = config.KEYSPACE;
      const localDatacenter = config.DATACENTER;
      const loadBalancingPolicy = new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(localDatacenter);
      const admin_user =  process.env.ADMIN_USER || 'cassandra';
      const admin_password = process.env.ADMIN_PASSWORD || 'cassandra';
      log.info('admin_user: %s, admin_password: %s ',admin_user,admin_password);
      const authProviderInfo = new cassandra.auth.PlainTextAuthProvider(admin_user, admin_password);

      const clientOptions = {
        policies: {
          loadBalancing: loadBalancingPolicy
        },
        contactPoints: config.ENDPOINTS,
        socketOptions: { readTimeOut: 0 },
        authProvider: authProviderInfo
      };

      this.client = new cassandra.Client(clientOptions);

    } catch (err) {
      log.error('Creating Cassandra client failed : %o', err);
    }
  }

  backup() {
    const time = Math.floor((new Date() - 259200) / 1000); // 6 months ago
    const numberOfRecords = 100;
    const query = `SELECT * FROM ${this.keyspace}.orders WHERE db_time >= toTimestamp(${time}) LIMIT ${numberOfRecords} ALLOW FILTERING;`; // change to <
    this.client.execute(query, async function (err, result) {
      if (err)
        log.error(err);
      else if (result) {
        this.writeSingleRecord(result);
      }
    });
  }

  writeRecordsAsStream(result) {
    let streamWriter = csvWriter({
      headers: ['exchange', 'asset_pair', 'db_time', 'order_id', 'order_type', 'price', 'size'],
      newline: '\n',
    });
    streamWriter.pipe(fs.createWriteStream('C:/Source/backup_file.csv', { flags: 'a' }));

    result.rows.forEach(function(row) {
      let cur_record = [];
      cur_record.push(row.exchange);
      cur_record.push(row.asset_pair);
      cur_record.push(row.db_time);
      cur_record.push(row.order_id);
      cur_record.push(row.order_type);
      cur_record.push(row.price);
      cur_record.push(row.size);
      writer.write(cur_record);
    });
    streamWriter.end();
  }

  async writeSingleRecord(result) {
    let cur_records = [];
    let ready = true;
    let i  = 0;

    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
      path: 'C:/Source/backup_file_single.csv',
      header: [
        { id: 'exchange', title: 'exchange' },
        { id: 'asset_pair', title: 'asset_pair' },
        { id: 'db_time', title: 'db_time' },
        { id: 'order_id', title: 'order_id' },
        { id: 'order_type', title: 'order_type' },
        { id: 'price', title: 'price' },
        { id: 'size', title: 'size' }
      ]
    });

    result.rows.forEach(function(row) {
      cur_records = [
        { id: 'asset_pair', title: row.asset_pair },
        { id: 'db_time', title: row.db_time },
        { id: 'order_id', title: row.order_id },
        { id: 'order_type', title: row.order_type },
        { id: 'price', title: row.price },
        { id: 'size', title: row.size }
      ];
    });

    ready = false;
    await csvWriter.writeRecords(cur_records);
    console.log('...Done');
    // returns a promise
    // .then(() => {
    //   console.log('...Done');
    // });
  }


}