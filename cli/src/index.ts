#!/usr/bin/env node

import inquirer, {Separator} from 'inquirer';
import InterruptedPrompt from 'inquirer-interrupted-prompt';

import FileTreeSelectionPrompt from 'inquirer-file-tree-selection-prompt';
import {auth} from './actions/auth/auth';
import {deploy} from './actions/deploy/deploy';
import {settings} from './actions/settings/settings';
import {setupAssets} from './actions/asset/setup-assets';
import {setupBridge} from './actions/bridge/setup-bridge';
import {setupValidator} from './actions/validator/setup-validator';
import {view} from './actions/view/view';
import {printLogo} from './logo';
import {IntrList} from './utils/interrupted-list';
import {setupUnitAssets} from './actions/unit-asset/setup-assets';
import {setupUnitBridge} from './actions/unit-bridge/setup-bridge';

InterruptedPrompt.replaceAllDefaults(inquirer);
inquirer.registerPrompt('file-tree-selection', FileTreeSelectionPrompt)
inquirer.registerPrompt('list', IntrList);


enum START_ACTION {
    AUTH,
    SETUP_ASSETS,
    SETUP_UNIT_ASSETS,
    SETUP_BRIDGE,
    SETUP_UNIT_BRIDGE,
    SETUP_VALIDATOR,
    DEPLOY,
    VIEW,
    SETTINGS,
    EXIT= '..'
}
async function start() {
    try {
        const prompt = inquirer
          .prompt([
              {
                  type: 'list',
                  name: 'action',
                  message: 'Chose an action',
                  choices: [
                      {name: 'Auth', value: START_ACTION.AUTH},
                      {name: 'Setup Assets', value: START_ACTION.SETUP_ASSETS},
                      {name: 'Setup Unit Assets', value: START_ACTION.SETUP_UNIT_ASSETS},
                      {name: 'Setup Bridge', value: START_ACTION.SETUP_BRIDGE},
                      {name: 'Setup Unit Bridge', value: START_ACTION.SETUP_UNIT_BRIDGE},
                      {name: 'Setup Validator', value: START_ACTION.SETUP_VALIDATOR},
                      {name: 'Deploy', value: START_ACTION.DEPLOY},
                      {name: 'View', value: START_ACTION.VIEW},
                      {name: 'Settings', value: START_ACTION.SETTINGS},
                      {name: 'Exit', value: START_ACTION.EXIT},
                      new Separator()],
                  pageSize: 9
              }
          ]);

        const {action} = await prompt.catch(() => ({action: START_ACTION.EXIT}));

        switch (action) {
            case START_ACTION.AUTH:
                await auth()
                break
            case START_ACTION.SETUP_ASSETS:
                await setupAssets()
                break
            case START_ACTION.SETUP_UNIT_ASSETS:
                await setupUnitAssets()
                break
            case START_ACTION.SETUP_BRIDGE:
                await setupBridge()
                break
            case START_ACTION.SETUP_UNIT_BRIDGE:
                await setupUnitBridge()
                break
            case START_ACTION.SETUP_VALIDATOR:
                await setupValidator()
                break
            case START_ACTION.DEPLOY:
                await deploy()
                break
            case START_ACTION.VIEW:
                await view()
                break
            case START_ACTION.SETTINGS:
                await settings()
                break
            case START_ACTION.EXIT:
                process.exit()
                return
        }

        return start();
    } catch (e) {
        return start();
    }

}
printLogo()
start()
