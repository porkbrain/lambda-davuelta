const AWS = require('aws-sdk')
AWS.config.update({ region: 'eu-west-1' })

exports.handler = async (event, _, callback) => {
  try {
    const touples = parseTouples(event.body)

    console.log('Touples', touples)

    if (touples.length > process.env.MAX_CODES) {
      throw new Error('Number of matches too high.')
    }

    const sns = await Promise.all(touples.map((Message) => {
      return new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message,
          TopicArn: process.env.SNS_TOPIC
        })
        .promise()
    }))

    console.log('Topics', sns)

    callback(null, { statusCode: 200 })
  } catch(e) {
    console.log('Lambda failed for data', event, 'with error', e)

    callback(null, { statusCode: 500 })
  }
}

const parseTouples = (body) => {
  body = body.replace(/\n/gmi, '')

  const res = /(\d{12}).{0,10}([a-z0-9]{4,7}\/\d{2}\/\d{4})/is.exec(body)

  console.log('Parsed', body, 'via', res)

  if (!res || !res[0]) {
    throw new Error('No touples found.')
  }

  return res[0]
}
