const normalizedTo2Digits = (num) => {
  return num < 10 ? `0${num}` : num;
};

const DateUtils = {

  toUTC: (date) => {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  },

  UTCtoLocal: (utc_date) => {
    let newDate = new Date(utc_date.getTime() + utc_date.getTimezoneOffset() * 60 * 1000);

    const offset = utc_date.getTimezoneOffset() / 60;
    const hours = utc_date.getHours();

    newDate.setHours(hours - offset);

    return newDate;
  },

  defaultFormat: (date) => {
    return `${date.getYear() - 100}-${normalizedTo2Digits(date.getMonth() + 1)}-${normalizedTo2Digits(date.getDate())} ${normalizedTo2Digits(date.getHours())}:${normalizedTo2Digits(date.getMinutes())}:${normalizedTo2Digits(date.getSeconds())}`;
  },

  lastWeek: () => {
    // calculate last week date
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  },

  yesterday: () => {
    // calculate yesterday date
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  },

  format: (date) => {
    return (fnsFormat(date, format));
  },

  parseUTtcToLocalTime: (strDate) => {
    // convert UTC to local time
    const dateParts = strDate.split('.');
    dateParts.pop();
    const utcDateStr = `${dateParts.join('.')}.000Z`;
    return new Date(utcDateStr);
  }
};


const NumericUtils = {

  RoundX: (num, decimalPlaces = 2) => {

    if (isNaN(num)) return undefined;

    if (decimalPlaces < 0) decimalPlaces = 2;

    if (num.toFixed && num % 1 !== 0)
      // Cast to string and return the last two numbers.
      return num.toFixed(decimalPlaces);

    return num.toString();
  }
};

const PromiseUtils = {

  promiseTimeout: (ms, promise) => {
    let id;
    let timeout = new Promise((resolve, reject) => {
      id = setTimeout(() => {
        const log = require('log');
        log.info('promise timed out.');
        resolve({ isTimeout: true, err: `Promise timed out after ${ms} ms.` });
      }, ms);
    });

    return Promise.race([promise, timeout]).then((result) => {
      clearTimeout(id);

      /**
       * ... we also need to pass the result back
       */
      return result;
    });

    // use like this --> promiseTimeout(500, new Promise(resolve => {  resolve()}));

  }
};



module.exports = { DateUtils, NumericUtils, PromiseUtils };