import * as inquirer from 'inquirer';

export async function setupBridge() {
  const {bridgeAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'bridgeAction',
        message: 'What do you want to do with the bridge?',
        choices: ['Init bridge',
          'Set manager',
          'Set fee collector',
          'Set validator',
          'Start bridge',
          'Stop bridge',
          '..']
      }
    ]).catch(() => '..');

  switch (bridgeAction) {
    default:
      return
  }
}
