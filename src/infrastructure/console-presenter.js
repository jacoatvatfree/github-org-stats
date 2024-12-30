import chalk from 'chalk';
import ora from 'ora';

export class ConsolePresenter {
  display(analysis) {
    console.log(chalk.bold.blue(`\nAnalysis for ${analysis.name}:`));
    console.log(chalk.gray('----------------------------------------'));

    console.log(chalk.yellow(`Total Stars: ${analysis.totalStars}`));
    console.log(chalk.yellow(`Total Members: ${analysis.memberCount}`));

    console.log(chalk.bold.green('\nTop Repositories:'));
    analysis.topRepos.forEach((repo, index) => {
      console.log(chalk.white(`${index + 1}. ${repo.name} (${repo.stars} stars)`));
    });

    console.log(chalk.bold.green('\nTop Contributors:'));
    analysis.topContributors.forEach((contributor, index) => {
      console.log(chalk.white(
        `${index + 1}. ${contributor.login} (${contributor.contributions} contributions)`
      ));
    });
  }

  displayError(error) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}
