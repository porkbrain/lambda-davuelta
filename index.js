const AWS = require('aws-sdk')
AWS.config.update({ region: 'eu-west-1' })

exports.handler = async (event, _, callback) => {
  try {
    const touples = parseTouples(event.body)

    console.log('Touples', touples)

    if (touples.length > process.env.MAX_CODES) {
      throw new Error('Number of matches too high.')
    }

    const sns = await Promise.all(touples.map((touple) => {
      return new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message: touple,
          TopicArn: process.env.SNS_TOPIC
        })
        .promise()
    }))

    console.log('Topics', sns)

    callback(null, { statusCode: 200 })
  } catch (e) {
    console.log('Lambda failed for data', event, 'with error', e)

    callback(null, { statusCode: 500 })
  }
}

const parseTouples = (body) => {
  return String(body.replace(/\n/g, '_').toString('utf8'))
    .split('DATEVUELTA')
    .map((search) => {
      const id = /\d{12}/gmi.exec(search)
      const reference = /[a-z0-9]{4,7}\/\d{2}\/\d{4}/gmi.exec(search)

      return id && reference
        ? `${id[0]} ; ${reference[0]}`
        : null
    })
    .filter(Boolean)
}
