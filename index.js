const AWS = require('aws-sdk')
AWS.config.update({ region: 'eu-west-1' })
const { JSDOM } = require("jsdom")

exports.handler = async (event, _, callback) => {
  try {
    const { account_id, webhook_id, message_data } = JSON.parse(event.body)

    if (account_id !== process.env.ACCOUNT_ID || webhook_id !== process.env.WEBHOOK_ID) {
      return callback(null, { statusCode: 403 })
    }

    const touples = parseTouples(message_data)

    console.log('Touples', touples)

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

const parseTouples = ({ bodies }) => {
  const { window } = new JSDOM(bodies.find(({ type }) => type === 'text/html').content)

  return Array.from(window.document.querySelectorAll('table tr'))
    .filter(el => /\>datevuelta/gmi.test(el.innerHTML))
    .map((row) => Array.from(row.querySelectorAll('td'))
    .slice(-2)
    .map(el => el.textContent.trim()))
}
