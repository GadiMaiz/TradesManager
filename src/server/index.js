import logger from 'logger';

class Server {
  constructor() {

  }

  async start(cb) {

    if (!this.config || !this.config.HTTP_PORT)
      throw new Error('RecordingService: Invalid config');

    const app = express();

    // assign middlewares
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    try {
      // const ramlMiddleware = await osprey.loadFile(path.join(__dirname, '/routes/raml/api.raml'));

      // app.use(ramlMiddleware);
    }
    catch (err) {
      log.error(err);
    }

    // routing
    app.use('/api', api);
    app.use(errorHandler);

    const http = require('http');

    this.service = http.createServer(app).listen(this.config.HTTP_PORT, null, () => {
      const port = this.service.address().port;
      log.info(`Recording service is listening at: localhost:${port}.`);

      if (cb) cb(null, this);
    });

  }

  stop() {
    logger.info('server is going down...');
  }

  getClientNum() {
    return 5;
  }
}

const server = new Server();

export default server;