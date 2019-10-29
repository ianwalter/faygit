#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const { print } = require('@ianwalter/print')
const { oneLine } = require('common-tags')
const { generateRepo } = require('.')

async function run () {
  const { _: [dir], $package, ...config } = cli({ 
    name: 'faygit',
    opts: {
      alias: {
        force: 'f'
      }
    }
  })
  const { numberOfCommits } = await generateRepo({ dir, ...config })
  print.success(oneLine`
    Added ${numberOfCommits} commit${numberOfCommits > 1 ? 's' : ''}!
  `)
}

run().catch(err => print.error(err))
