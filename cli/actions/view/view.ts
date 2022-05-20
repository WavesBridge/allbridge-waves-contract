import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';

enum VIEW_ACTION {
  ASSET,
  LOCK,
  UNLOCK,
  BRIDGE,
  VALIDATOR
}

export async function view() {
  const {viewAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'viewAction',
        message: 'What do you want to view?',
        choices: [
          {name: 'Get asset info', value: VIEW_ACTION.ASSET},
          {name: 'Get lock info', value: VIEW_ACTION.LOCK},
          {name: 'Has unlock', value: VIEW_ACTION.UNLOCK},
          {name: 'Get bridge configs', value: VIEW_ACTION.BRIDGE},
          {name: 'Get validator configs', value: VIEW_ACTION.VALIDATOR},
          '..',
          new Separator()
        ]
      }
    ]).catch(() => ({action: '..'}));

  switch (viewAction) {
    default:
      return
  }
}
