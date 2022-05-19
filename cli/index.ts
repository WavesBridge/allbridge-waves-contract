import clear from 'clear';
import {logo} from './logo';
import inquirer, {Separator} from 'inquirer';
import InterruptedPrompt from 'inquirer-interrupted-prompt';

import FileTreeSelectionPrompt from 'inquirer-file-tree-selection-prompt';
import {auth} from './config/auth';
import {deploy} from './actions/deploy/deploy';
import {settings} from './config/settings';
import {Store} from './config/store';
import {setupAssets} from './actions/asset/setup-assets';
import {setupBridge} from './actions/bridge/setup-bridge';
import {setupValidator} from './actions/validator/setup-validator';
import {view} from './actions/view/view';

InterruptedPrompt.replaceAllDefaults(inquirer);
inquirer.registerPrompt('file-tree-selection', FileTreeSelectionPrompt)

const CLI = require('clui'),
    clc = require('cli-color');

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

new Line(outputBuffer)
    .column('Bridge vddress:', 20, [clc.cyan])
    .column(Store.bridgeAddress, undefined, [clc.white])
    .fill()
    .store();

new Line(outputBuffer)
  .column('Validator address:', 20, [clc.cyan])
  .column(Store.validatorAddress || '', undefined, [clc.white])
  .fill()
  .store();

new Line(outputBuffer)
    .fill()
    .store();
clear()
outputBuffer.output();

async function start() {
    const {action} = await inquirer
        .prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Chose an action',
                choices: ['Auth', 'Setup Assets', 'Setup Bridge', 'Setup Validator', 'Deploy', 'View', 'Settings', 'Exit', new Separator()]
            }
        ]).catch(() => ({action: 'Exit'}));
    switch (action) {
        case 'Auth':
            await auth()
            break
        case 'Setup Assets':
            await setupAssets()
            break
        case 'Setup Bridge':
            await setupBridge()
            break
        case 'Setup Validator':
            await setupValidator()
            break
        case 'Deploy':
            await deploy()
            break
        case 'View':
            await view()
            break
        case 'Settings':
            await settings()
            break
        case 'Exit':
            return
    }

    return start();
}

start()
