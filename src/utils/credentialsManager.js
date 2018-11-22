import fs from 'fs';



class CredentialsManager {
  constructor(path) {
    const content = fs.readFileSync(path);
    this.credentials = JSON.parse(content);
  }

  getCredentials(exchange, userId) {
    return this.credentials[userId][exchange];
  }

  getAllCredentials() {
    return this.credentials;
  }

}


module.exports = CredentialsManager;