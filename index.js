const path = require('path')
const { promises: fs } = require('fs')
const casual = require('casual')
const { html } = require('common-tags')
const cheerio = require('cheerio')
const execa = require('execa')
const { Print } = require('@ianwalter/print')
const { subDays, addDays } = require('date-fns')
const { utcToZonedTime } = require('date-fns-tz')

const stdio = 'inherit'

const getRandomInt = (max, min = 1) => Math.max(
  Math.floor(Math.random() * Math.floor(max)),
  min
)

// Generate an HTML file.
const generateFile = () => {
  // Use a random title for the page title and h1.
  const heading = casual.title

  // Generate the paragraphs that will go into the HTML body.
  const paragraphs = []
  for (let i = 0; i < getRandomInt(5); i++) {
    paragraphs.push({
      heading: casual.title,
      body: casual.text
    })
  }

  return {
    filename: `${casual.word}.html`,
    source: html`
      <html>
        <head>
          <title>${heading}</title>
        </head>
        <body>

          <h1>${heading}</h1>

          ${paragraphs.reduce(
    (acc, paragraph) => (acc += html`
              <p>

                <h2>${paragraph.heading}</h2>

                ${paragraph.body}

              </p>

            `) && acc,
    ''
  )}
        </body>
      </html>
    `
  }
}

// Swap a random paragraph in a given file with a new randomly generated one.
const modifyFile = file => {
  const $ = cheerio.load(file.source)
  const paragraphs = $('p')
  const index = getRandomInt(paragraphs.length) - 1
  $(paragraphs[index]).text(casual.text)
  return { ...file, source: $.html() }
}

// Generate the dummy commit data for our dummy repository.
const generateData = config => {
  const data = {
    authors: [],
    commits: [],
    files: [],
    numberOfAuthors: getRandomInt(9),
    numberOfFiles: getRandomInt(10),
    numberOfCommits: getRandomInt(100),
    numberOfDays: getRandomInt(30),
    ...config,
    dir: path.resolve(config.dir || '.')
  }

  // Make sure there aren't more authors than there are commits.
  data.numberOfAuthors = data.numberOfAuthors > data.numberOfCommits
    ? data.numberOfCommits
    : data.numberOfAuthors

  // Generate the dummy commit authors.
  const numberOfAuthorsNeeded = data.numberOfAuthors - data.authors.length
  for (let i = 0; i < numberOfAuthorsNeeded; i++) {
    data.authors.push({ name: casual.full_name, email: casual.email })
  }

  // Make sure there aren't more days than there are commits.
  data.numberOfDays = data.numberOfDays > data.numberOfCommits
    ? data.numberOfCommits
    : data.numberOfDays

  // Generate the dummy commits.
  const numberOfCommitsNeeded = data.numberOfCommits - data.commits.length
  const numberOfCommitsADay = Math.floor(
    data.numberOfCommits / data.numberOfDays
  )
  const endDate = utcToZonedTime(new Date(), casual.timezone)
  let commitDate = subDays(endDate, data.numberOfDays)
  for (let i = 0; i < numberOfCommitsNeeded; i++) {
    //
    if (i % numberOfCommitsADay === 0) {
      commitDate = addDays(commitDate, 1)
    }

    if (data.files.length < data.numberOfFiles) {
      // Generate new files to be added to the repository.
      const numberOfFiles = getRandomInt(2)
      for (let n = 0; n < numberOfFiles; n++) {
        data.files.push(generateFile())
      }
    } else {
      // Modify existing files in the repository.
      const numberOfFilesToModify = getRandomInt(data.files.length)
      const filesToModify = new Set([])
      for (let n = 0; n < numberOfFilesToModify; n++) {
        filesToModify.add(getRandomInt(data.files.length) - 1)
      }
      filesToModify.forEach(file => {
        data.files[file] = modifyFile(data.files[file])
      })
    }

    data.commits.push({
      subject: casual.title,
      ...getRandomInt(10) === 5 ? { body: casual.description } : {},
      files: data.files.slice(),
      author: data.authors[getRandomInt(data.numberOfAuthors) - 1],
      date: i === (numberOfCommitsNeeded - 1) ? endDate : commitDate
    })
  }

  return data
}

// Generate a dummy git repository.
const generateRepo = async config => {
  const print = new Print({ level: config.logLevel || 'info' })

  // Generate the dummy commit data.
  const data = generateData(config)
  print.debug('Data', { ...data, commits: '...', files: '...' })

  // Make the directory if it doesn't exist and initialize the git repository.
  if (data.dir !== process.cwd()) {
    await execa('mkdir', ['-p', data.dir], { stdio })
  }
  await execa('git', ['init'], { cwd: data.dir, stdio })

  for (const commit of data.commits) {
    // Write the files contained in the commit to the file system.
    await Promise.all(commit.files.map(async file => {
      await fs.writeFile(path.join(data.dir, file.filename), file.source)
    }))

    // Stage all the file changes.
    await execa('git', ['add', '.'], { cwd: data.dir, stdio })

    // Commit all the file changes.
    const input = `${commit.subject}${commit.body ? `\n\n${commit.body}` : ''}`
    const options = { input, cwd: data.dir, stderr: 'inherit' }
    const author = `--author="${commit.author.name} <${commit.author.email}>"`
    const date = `--date="${commit.date}"`
    await execa('git', ['commit', author, date, '-F', '-'], options)
  }

  return data
}

module.exports = { generateData, generateRepo }
