import * as inquirer from 'inquirer';

export async function view() {
  const {bridgeAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'bridgeAction',
        message: 'What do you want to view?',
        choices: ['Get asset info',
          'Get lock info',
          'Has unlock',
          'Get bridge configs',
          'Get validator configs',
          '..']
      }
    ]).catch(() => '..');

  switch (bridgeAction) {
    default:
      return
  }
}
