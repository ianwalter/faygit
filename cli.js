#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const { print } = require('@ianwalter/print')
const { generateData } = require('.')

async function run () {
  const { _: [dir], $package, ...config  } = cli({ name: 'faygit' })
  const data = generateData({ dir, ...config })
  print.success(`Created a git repository at ${data.dir}`, data)
}

run().catch(err => print.error(err))

