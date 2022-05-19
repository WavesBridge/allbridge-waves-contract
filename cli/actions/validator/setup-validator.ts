import * as inquirer from 'inquirer';

export async function setupValidator() {
  const {validatorAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'validatorAction',
        message: 'What do you want to do with the validator?',
        choices: ['Init validator',
          'Set admin',
          'Set oracle',
          'Set bridge',
          '..']
      }
    ]).catch(() => '..');

  switch (validatorAction) {
    default:
      return
  }
}
