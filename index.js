const AWS = require('aws-sdk')
AWS.config.update({ region: 'eu-west-1' })

/**
 * Several different ways to parse the information from an email.
 */
const parsers = [
  (body) => {
    // Finds a number which is prepended by JIK string.
    const jik = /JIK č\.(\d+),/.exec(body)
    return jik ? [`molcesko: ${jik[0]}`] : []
  },
  (body) => {
    // We replace all new lines which break the regex.
    return String(body.replace(/\n/g, '_').toString('utf8'))
      // Find the table cell with davuelta.
      .split('DATEVUELTA')
      .map((search) => {
        // An id is a 12 digit number
        const id = /\d{12}/gmi.exec(search)
        // Reference starts with a sequence of a few characters and then with
        // two numbers.
        const reference = /[a-z0-9]{4,7}\/\d{2}\/\d{4}/gmi.exec(search)

        return id && reference
          ? `${id[0]} ; ${reference[0]}`
          : null
      })
      .filter(Boolean)
  }
]

exports.handler = async (event, _, callback) => {
  try {
    let tuples = []
    for (const parser of parsers) {
      tuples = parser(event.body)
      if (tuples.length > 0) {
        break
      }
    }

    console.log('tuples', tuples)

    if (tuples.length > process.env.MAX_CODES) {
      throw new Error('Number of matches too high.')
    }

    const sns = await Promise.all(tuples.map((touple) => {
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

const parsetuples = (body) => {
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
