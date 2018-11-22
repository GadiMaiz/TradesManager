import express from 'express';
const router = express.Router();
import NotificationManager from '../src/utils/notificationManager';

const notificationManager = new NotificationManager();

router.post('/orderNotification' , async (req, res, next) => {
  try{
    notificationManager.notify(req.body);
    // const params = { name: req.body.name, description: req.body.description };
    // const requestsExecuter = getRequestsExecuter();
    // requestsExecuter.createNewAccount(params);
    res.end('OK');
  }
  catch(err) {
    next(err);
  }
});


export default router;
