import observe from 'inquirer/lib/utils/events';
import ListPrompt from 'inquirer/lib/prompts/list';

export class IntrList extends ListPrompt {
  run(): Promise<any> {
    return new Promise((resolve, reject) => {
      const events = observe(this.rl);
      events.keypress.pipe().forEach(event => {
        if (event.key.name === 'escape') {
          const backIndex = this.opt.choices.realChoices.findIndex((ch) => ch.value === '..');
          if (backIndex >= 0) {
            this.selected = backIndex;
            this.status = 'answered';
            this.render();
            this.screen.done();
            this.done('..');
          }
        }
      });
      super.run().then(resolve, reject);
    })
  }
}


