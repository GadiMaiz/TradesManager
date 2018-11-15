
process.title = ['Bitmain recording archive service']; 

import async from 'async';
import log from 'logger';
import ArchiverService from './archiver/index';
import ConfigManager from 'node-config-module';
import * as constants from './constants';

log.info('[APP] Starting service initialization');

const RUN_MODE = process.env.npm_lifecycle_event;

const cassandra_ip =  process.env.CASSANDRA_IP || '127.0.0.1'; // ['35.193.97.63:9042'],
const cassandra_port = process.env.CASSANDRA_PORT || '9042';
const cassandra_endpoint = cassandra_ip + ':' + cassandra_port;
log.info('Cassandra endpoint: %s',cassandra_endpoint);


const defaultConfig = {
  HTTP_PORT: RUN_MODE === 'run:prod'  ? process.env.SERVER_PORT : 9010,
  DB: {
    ENDPOINTS: [cassandra_endpoint],
    KEYSPACE: 'smart_trade_recordings'
  },
  LOG: {
    LOG_LEVEL: constants.DEFAULT_LOG_LEVEL,
    LOG_MAX_FILES: constants.DEFAULT_LOG_MAX_FILES,
    LOG_MAX_FILE_SIZE: constants.DEFAULT_LOG_MAX_FILE_SIZE
  }
};

// Initialize Modules
async.autoInject({
  config: function (callback) {
    ConfigManager.init(defaultConfig, null, callback);
    ConfigManager.setConfigChangeCallback('log', function (newConfig, prevConfig) {
      updateLogConfig(newConfig);
    });
  },
  start_service: function (config, callback) {
    const server = new ArchiverService(config);
    server.backup(config);
  }
}, function (err) {
  if (err) {
    log.error(`[APP] initialization failed: ${err}`);
  } else {
    log.info('[APP] initialized SUCCESSFULLY');
  }
});

const updateLogConfig = (newConfig) => {
  const { LOG_LEVEL, LOG_MAX_FILE_SIZE, LOG_MAX_FILES } = newConfig.LOG;
  log.updateLogConfig(LOG_LEVEL, LOG_MAX_FILE_SIZE, LOG_MAX_FILES);
};