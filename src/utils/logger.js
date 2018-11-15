const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const fs = require('fs');
const path = require('path');
const LOG_DIR = 'logs';
const LOG_FILE_NAME = !!process.title && process.title !== 'npm' ? process.title : require('../../package.json').name;
import { DateUtils } from './utils';

const tsFormat = () => {
  try {
    return DateUtils.defaultFormat(new Date());
  }
  catch (err) {
    // console.error(err);
  }
};

const myFormat = printf(info => {
  return `${tsFormat(info.timestamp)} ${info.level}: ${info.message}`;
});


// Create the log directory if it does not exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const consoleFormat = combine(
  format.colorize(),
  format.splat(),
  timestamp(),
  myFormat
);


const fileFormat = combine(
  format.splat(),
  timestamp(),
  myFormat
);

class STLogger {

  constructor() {

    this._logger = createLogger({
      exitOnError: false,
      format: fileFormat,
      transports: this.defineTransports(),
      exceptionHandlers: this.exceptionHandlers()
    });

  }

  defineTransports() {
    return [
      new transports.Console({
        level: 'debug',
        name: 'console',
        format: consoleFormat
      }),
      new transports.File({
        level: 'info',
        name: 'file',
        filename: path.join(LOG_DIR, `/${LOG_FILE_NAME}.log`),
        format: fileFormat,
        maxsize: 1024 * 1024 * 5, // 5 Mb,
        maxFiles: 10,
      })

    ];
  }

  exceptionHandlers() {
    return [
      new transports.Console({
        level: 'error',
        name: 'console',
      }),
      new transports.File({
        level: 'error',
        name: 'file',
        filename: path.join(LOG_DIR, `/${LOG_FILE_NAME}.error.log`),
        maxsize: 1024 * 1024 * 5, // 5 Mb,
        maxFiles: 10,
      })
    ];
  }

  info(msg, ...meta) { if (this._logger) this._logger.info(msg, ...meta); }

  error(msg, ...meta) { if (this._logger) this._logger.error(msg, ...meta); }

  debug(msg, ...meta) { if (this._logger) this._logger.debug(msg, ...meta); }

  warn(msg, ...meta) { if (this._logger) this._logger.warn(msg, ...meta); }

  verbose(msg, ...meta) { if (this._logger) this._logger.verbose(msg, ...meta); }

  level() { return this._logger && this._logger.transports[1] ? this._logger.transports[1].level : 'debug (initializing)'; }

  getFileLogLevel() {
    return this._logger.transports[1].level;
  }

  setLogLevel(newLevel) {
    if (!newLevel) {
      this.warn('New log level cannot be empty, ignoring');
      return;
    }

    // go to lower case to be agnostic to ini file casing and simple human mistakes.
    newLevel = newLevel.toLowerCase();

    if (!(newLevel == 'info' || newLevel == 'debug' || newLevel == 'error' || newLevel == 'warn')) {
      this.warn('New log level "%s" is invalid, no change in value ("%s"). Allowed values are: "INFO" (recommended), "DEBUG", "WARN" or "ERROR".', newLevel, this._logger.transports[1].level);
    }
    else if (this._logger.transports[1].level !== newLevel) {
      this._logger.transports[1].level = newLevel;
      this.info('Log level was set to "%s".', newLevel.toUpperCase());
    }
    else {
      this.debug('Set log level ignored, no change in value ("%s").', this._logger.transports[1].level);
    }

  }

  setLogMaxFileSize(newSize) {
    switch (true) {
      case !newSize: {
        this.warn('New log max size cannot be empty, ignoring');
        return;
      }
      case isNaN(newSize): {
        this.warn('New log max size must be numeric, ignoring');
        return;
      }
      case newSize < 1: {
        this.warn('New log max files cannot be less than 1 kb, ignoring');
        return;
      }
      case this._logger.transports[1].maxsize === (newSize * 1024): {
        this.debug('Set log max size ignored, no change in value (%s).', this._logger.transports[1].maxsize);
        return;
      }
    }

    // max file size in config is expressed in KB, while logger uses bytes.
    this._logger.transports[1].maxsize = newSize * 1024;
    this._logger.transports[3].maxsize = newSize * 1024;

    this.info('Log file max size was set to %s KB.', newSize);

  }

  setLogMaxFiles(newMaxFiles) {
    switch (true) {
      case !newMaxFiles: {
        this.warn('New log max files cannot be empty, ignoring');
        return;
      }
      case Number.isNaN(newMaxFiles): {
        this.warn('New log max files must be numeric, ignoring');
        return;
      }
      case newMaxFiles < 1: {
        this.warn('New log max files cannot be less than 1, ignoring');
        return;
      }
      case this._logger.transports[1].maxFiles === newMaxFiles: {
        this.debug('Set log max files ignored, no change in value (%s).', this._logger.transports[1].maxFiles);
        return;
      }
    }

    this._logger.transports[1].maxFiles = newMaxFiles;
    this._logger.transports[3].maxFiles = newMaxFiles;

    this.info('Log max files was set to %s.', newMaxFiles);
  }

  updateLogConfig(logLevel, logMaxFileSize, logMaxFiles) {
    this.setLogLevel(logLevel);
    this.setLogMaxFileSize(logMaxFileSize);
    this.setLogMaxFiles(logMaxFiles);
  }

}

/*   winston log levels are: silly, debug, verbose, info, warn, error   */

let log = new STLogger();

module.exports = log;