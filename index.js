const path = require('path')
const { promises: fs } = require('fs')
const faker = require('faker')
const { html } = require('common-tags')
const cheerio = require('cheerio')
const execa = require('execa')

const getRandomInt = (max, min = 1) => Math.floor(
  Math.random() * Math.floor(max),
  min
)

const generateFile = () => {
  const heading = faker.random.words()
  const numberOfParagraphs = getRandomInt(5)
  const paragraphs = []

  for (let i = 0; i < numberOfParagraphs; i++) {
    paragraphs.push({
      heading: faker.random.words(),
      body: faker.lorem.paragraph()
    })
  }

  return {
    filename: `${faker.random.word()}.html`,
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

const modifyFile = file => {
  const $ = cheerio.load(file.source)
  const paragraphs = $('p')
  const index = getRandomInt(paragraphs.length) - 1
  paragraphs[index].text(faker.lorem.paragraph())
  file.source = $.html()
}

const generateData = config => {
  const data = {
    authors: [],
    commits: [],
    files: [],
    numberOfAuthors: getRandomInt(9),
    numberOfFiles: getRandomInt(10),
    numberOfCommits: getRandomInt(100),
    ...config,
    dir: path.resolve(config.dir || '.')
  }

  const numberOfAuthorsNeeded = data.numberOfAuthors - data.authors.length
  for (let i = 0; i < numberOfAuthorsNeeded; i++) {
    data.authors.push({
      name: faker.name.findName(),
      email: faker.internet.email()
    })
  }

  const numberOfCommitsNeeded = data.numberOfCommits - data.commits.length
  for (let i = 0; i < numberOfCommitsNeeded; i++) {
    if (data.files.length < data.numberOfFiles) {
      const numberOfFiles = getRandomInt(2)
      for (let n = 0; n < numberOfFiles; n++) {
        data.files.push(generateFile())
      }
    } else {
      const numberOfFilesToModify = getRandomInt(10)
      const filesToModify = new Set([])
      for (let n = 0; n < numberOfFilesToModify; n++) {
        filesToModify.add(getRandomInt(10))
      }
      console.log(filesToModify)
      filesToModify.forEach(file => {
        data.files[file] = modifyFile(data.files[file])
      })
    }

    data.commits.push({
      subject: faker.random.words(),
      ...getRandomInt(10) === 5 ? { body: faker.lorem.sentences() } : {},
      files: data.files.slice(),
      author: data.authors[getRandomInt(data.numberOfAuthors) - 1]
    })
  }

  return data
}

const generateRepo = async config => {
  const data = generateData(config)

  data.commits.forEach(async commit => {
    commit.files.forEach(file => {
      fs.writeFile(file.filename, file.source)
    })

    await execa('git', ['add', '.'])

    await execa('echo', [])
  })

  return data
}

module.exports = { generateData, generateRepo }
