import logger from 'logger';

class BalanceManager {
  constructor() {
    this.balances = {};
  }

  getAccountBalance(Account) {
    return this.balances[Account];
  }

  getBalance(currencyList, account) {
    if (!this.balances[account]) {
      return {};
    }
    return currencyList.map((item) => { return (this.balances[account]['Unified'][item]) ? this.balances[account]['Unified'][item] : 0; });
  }

  async updateAllBalance(balancesList, account) {
    logger.debug('updateAllBalances');
    if (!this.balances[account]) {
      this.balances[account] = {};
    }
    Object.keys(balancesList).forEach((exchangeName) => {

      if (!this.balances[account][exchangeName]) {
        this.balances[account][exchangeName] = {};
      }

      if (balancesList[exchangeName].balances) {
        Object.keys(balancesList[exchangeName].balances).forEach((asset) => {
          this.balances[account][exchangeName][asset] = balancesList[exchangeName].balances[asset].available;
        });

      }
    });
  }

  addToBalance(currency, size, account) {
    this.balances[account][currency] = this.balances[account][currency] + Number(size);
    this.balances[account][currency + '_ALL'] = this.balances[account][currency + '_ALL'] + Number(size);
  }

  subtractFromBalance(currency, size, account) {
    this.balances[account][currency] = this.balances[account][currency] - Number(size);
    this.balances[account][currency + '_ALL'] = this.balances[account][currency + '_ALL'] - Number(size);
  }


}

export default BalanceManager;