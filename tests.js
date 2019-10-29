const { test } = require('@ianwalter/bff')
const execa = require('execa')

test('cli', async ({ expect }) => {
  const { stdout } = await execa('yarn', ['faygit', 'tmp'])
  expect(stdout).toMatch(/Added [0-9]+ commits!/)
  await execa('git', ['rev-list', '--all', '--count'])
})
