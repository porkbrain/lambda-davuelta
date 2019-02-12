const AWS = require('aws-sdk')
AWS.config.update({ region: 'eu-west-1' })
const { JSDOM } = require("jsdom")

exports.handler = async (event, _, callback) => {
  try {
    const touples = parseTouples(new JSDOM(event.body))

    console.log('Touples', touples)

    if (touples.length > process.env.MAX_CODES) {
      throw new Error('Number of matches too high.')
    }

    await Promise.all(touples.map((touple) => {
      return new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message: touple.join(' ; '),
          TopicArn: process.env.SNS_TOPIC
        })
        .promise()
    }))

    callback(null, { statusCode: 200 })
  } catch(e) {
    console.log('Lambda failed for data', event, 'with error', e)

    callback(null, { statusCode: 500 })
  }
}

const parseTouples = ({ window }) => {
  return Array.from(window.document.querySelectorAll('table tr'))
    .filter(el => /[a-z0-9]{4,7}\/\d{2}\/\d{4}/i.test(el.innerHTML))
    .filter(el => /\d{12}/i.test(el.innerHTML))
    .map((row) => Array.from(row.querySelectorAll('td'))
    .slice(-2)
    .map(el => el.textContent.trim()))
    .filter(touple => touple.every(Boolean))
}
