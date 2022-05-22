import clear from 'clear';
import {Store} from './store';
import CLI from 'clui';
import clc from 'cli-color';
import {chainIdToName} from './utils/utils';

const Reset = "\x1b[0m"
const Bright = "\x1b[1m"

const FgYellow = "\x1b[93m"
const FgBlue = "\x1b[34m"
const FgWhite = "\x1b[97m";

export const logo =
  `${Bright}${FgBlue}            []                                       []
          .:[]:_                                   ,:[]:.
        .: :[]: :-.                             ,-: :[]: :.
      .: : :[]: : :\`._                       ,.': : :[]: : :.
    .: : : :[]: : : : :-._               _,-: : : : :[]: : : :.
_..: : : : :[]: : : : : : :-._________.-: : : : : : :[]: : : : :-._
_:_:_:_:_:_:[]:_:_:_:_:_:_:_:_:_:_:_:_:_:_:_:_:_:_:_:[]:_:_:_:_:_:_
!!!!!!!!!!!![]!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!![]!!!!!!!!!!!!!
${Reset + FgYellow}^^^^^^^^^^^^[]^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[]^^^^^^^^^^^^^
            []   ${FgWhite} _       _____ _    _____________${FgYellow}   []
            []   ${FgWhite}| |     / /   | |  / / ____/ ___/${FgYellow}   []
            []   ${FgWhite}| | /| / / /| | | / / __/  \\__ \\${FgYellow}    []
 ~~^-~^_~^~/  \\~~${FgWhite}| |/ |/ / ___ | |/ / /___ ___/ /${FgYellow}_^~/  \\~^-~_~^-~~-
~ _~~- ~^-^~-^~~-${FgWhite}|__/|__/_/  |_|___/_____//____/${FgYellow}~^-^ ~~-_^-~ ~^
   ~ ^- _~~_-  ~~ _ ~  ^~  - ~~^ _ -  ^~-  ~ _  ~~^  - ~_   - ~^_~
     ~-  ^_  ~^ -  ^~ _ - ~^~ _   _~^~-  _ ~~^ - _ ~ - _ ~~^ -`;


export function printLogo() {
  const Line = CLI.Line,
    LineBuffer = CLI.LineBuffer;

  let outputBuffer = new LineBuffer({
    x: 0,
    y: 0,
    width: 'console',
    height: 'console'
  });
  logo.split('\n').forEach(line => outputBuffer.addLine(new Line().column(line, 68)))

  new Line(outputBuffer)
    .fill()
    .store();

  if (Store.node) {
    new Line(outputBuffer)
      .column('Network:', 20, [clc.cyan])
      .column(`${Store.node.address} (${chainIdToName(Store.node.chainId)})`, undefined, [clc.white])
      .fill()
      .store();
  }

  if (Store.bridgeAddress) {
    new Line(outputBuffer)
      .column('Bridge address:', 20, [clc.cyan])
      .column(Store.bridgeAddress, undefined, [clc.white])
      .fill()
      .store();
  }
  if (Store.validatorAddress) {
    new Line(outputBuffer)
      .column('Validator address:', 20, [clc.cyan])
      .column(Store.validatorAddress || '', undefined, [clc.white])
      .fill()
      .store();
  }

  if (Store.useLedger === true) {
    new Line(outputBuffer)
      .column('Auth:', 20, [clc.cyan])
      .column(`Ledger (${Store.ledgerUserId})`, undefined, [clc.white])
      .fill()
      .store();
  } else if (Store.keyFileAddress) {
    new Line(outputBuffer)
      .column('Auth:', 20, [clc.cyan])
      .column(`Key file (${Store.keyFileAddress})`, undefined, [clc.white])
      .fill()
      .store();
  }

  new Line(outputBuffer)
    .fill()
    .store();
  clear()
  outputBuffer.output();
}
