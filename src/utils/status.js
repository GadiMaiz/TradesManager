
export const Status = {
  NoError: -1,
  Success: 0,
  Error: 1,
  ReceivedOnServer: 2,
  Pending: 3,
  CantExecute: 4,
  Cancelled: 5,
  Open: 6,
  Filled: 7,
  SentToExchange: 8,
  ProcessingOnServer: 9,
  NotLoggedIn : 10,
  RequestFailed : 11
};

export const returnMessages = {
  Success: 'Success',
  Error: 'Error',
  OrderSent: 'order sent',
  InputParametersMissing: 'input parameters are missing',
  NotLoggedIn: 'you are not logged in, login is required',
  RequestFailed: 'request failed',
  EventQueueInitFailed : 'event queue initialization failed'
};