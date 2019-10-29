#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const { print } = require('@ianwalter/print')
const { oneLine } = require('common-tags')
const { generateRepo } = require('.')
const { description } = require('./package.json')

async function run () {
  const { _: [dir], packageJson, ...config } = cli({
    name: 'faygit',
    description,
    usage: 'faygit <directory>',
    options: {
      force: {
        alias: 'f',
        description: `
          Whether to re-initialize git if the given directory is already a git
          repository
        `,
        default: false
      }
    }
  })

  if (config.help) {
    print.info(config.help)
  } else {
    const { numberOfCommits } = await generateRepo({ dir, ...config })
    print.success(oneLine`
      Added ${numberOfCommits} commit${numberOfCommits > 1 ? 's' : ''}!
    `)
  }
}

run().catch(err => print.error(err))
