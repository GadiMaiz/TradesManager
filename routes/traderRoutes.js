import express from 'express';
const router = express.Router();
import getNotificationManager from '../src/utils/notificationManager';


router.post('/orderNotification' , async (req, res, next) => {
  try{
    getNotificationManager().notify(req.body);
    res.end('OK');
  }
  catch(err) {
    next(err);
  }
});


export default router;
