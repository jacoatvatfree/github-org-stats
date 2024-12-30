#!/usr/bin/env node
import { program } from 'commander';
import { analyzeOrganization } from './application/analyze-organization.js';
import { GithubRepository } from './infrastructure/github-repository.js';
import { ConsolePresenter } from './infrastructure/console-presenter.js';

program
  .name('github-analyzer')
  .description('Analyze GitHub organizations')
  .requiredOption('-o, --org <organization>', 'GitHub organization name')
  .parse(process.argv);

const options = program.opts();
const githubRepo = new GithubRepository();
const presenter = new ConsolePresenter();

await analyzeOrganization(options.org, githubRepo, presenter);
