import Conf from 'conf';

enum KEY {
  KEY_FILE = 'keyFile',
  NODE = 'node',
  LEDGER_USER_ID = 'id',
  USE_LEDGER = 'useLedger',
  BRIDGE_ADDRESS = 'bridgeAddress',
  VALIDATOR_ADDRESS = 'validatorAddress',
  KEY_FILE_ADDRESS = 'keyFileAddress'
}
let storedSeed: string | undefined;
type Node = { address: string, chainId: number };

const config = new Conf<{
  [KEY.KEY_FILE]: string,
  [KEY.NODE]: Node,
  [KEY.LEDGER_USER_ID]: number,
  [KEY.USE_LEDGER]: boolean
  [KEY.BRIDGE_ADDRESS]: string
}>();


export class Store {
  static get keyFile(): string | undefined {
    return config.get(KEY.KEY_FILE);
  }

  static set keyFile(keyFile: string) {
    config.set(KEY.KEY_FILE, keyFile)
  }

  static get seed(): string | undefined {
    return storedSeed;
  }

  static set seed(seed: string) {
    storedSeed = seed;
  }

  static set node(node: Node) {
    config.set(KEY.NODE, node)
  }

  static get node(): Node | undefined {
    return config.get(KEY.NODE);
  }

  static get ledgerUserId(): number {
    return config.get(KEY.LEDGER_USER_ID)
  }

  static set ledgerUserId(value: number) {
    config.set(KEY.LEDGER_USER_ID, value)
  }

  static get useLedger(): boolean {
    return config.get(KEY.USE_LEDGER)
  }

  static set useLedger(value: boolean) {
    config.set(KEY.USE_LEDGER, value)
  }

  static set bridgeAddress(value: string) {
    config.set(KEY.BRIDGE_ADDRESS, value)
  }

  static get bridgeAddress(): string | undefined {
    return config.get(KEY.BRIDGE_ADDRESS)
  }

  static set validatorAddress(value: string) {
    config.set(KEY.VALIDATOR_ADDRESS, value)
  }

  static get validatorAddress(): string | undefined {
    return config.get(KEY.VALIDATOR_ADDRESS)
  }

  static set keyFileAddress(value: string) {
    config.set(KEY.KEY_FILE_ADDRESS, value)
  }

  static get keyFileAddress(): string | undefined {
    return config.get(KEY.KEY_FILE_ADDRESS)
  }
}
