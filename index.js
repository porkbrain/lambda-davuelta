const AWS = require("aws-sdk");
const emailParser = require("mailparser").simpleParser;

AWS.config.update({ region: "eu-west-1" });

/**
 * Several different ways to parse the information from an email.
 */
const parsers = [
  (body) => {
    // Finds a number which is prepended by JIK string.
    const jik = /JIK č\.(\d+),/i.exec(body);
    return jik ? [`molcesko: ${jik[0]}`] : [];
  },
  (body) => {
    // We replace all new lines which break the regex.
    return (
      String(body.replace(/\n/g, "_").toString("utf8"))
        // Find the table cell with davuelta.
        .split("DATEVUELTA")
        .map((search) => {
          // An id is a 12 digit number
          const id = /\d{12}/gim.exec(search);
          // Reference starts with a sequence of a few characters and then with
          // two numbers.
          const reference = /[a-z0-9]{4,7}\/\d{2}\/\d{4}/gim.exec(search);

          return id && reference ? `${id[0]} ; ${reference[0]}` : null;
        })
        .filter(Boolean)
    );
  },
];

async function handle(event, _, callback) {
  try {
    console.log("Got a new event:", event);
    const message = JSON.parse(event.Records.pop()?.Sns.Message || "");

    const contents = message.content;
    console.log("Parsing content:", contents);

    const email = await emailParser(contents);
    console.log("Email:", email);

    const text = `${email.subject}\n${email.text}`;

    let tuples = [];
    for (const parser of parsers) {
      tuples = parser(text);
      if (tuples.length > 0) {
        break;
      }
    }

    if (tuples.length > process.env.MAX_CODES) {
      throw new Error(`Number of matches too high: ${tuples.length}`);
    }

    const sns = await Promise.all(
      tuples.map((tuple) => {
        console.log("Tuple:", tuple);
        return new AWS.SNS({ apiVersion: "2010-03-31" })
          .publish({
            Message: tuple,
            TopicArn: process.env.SNS_TOPIC,
          })
          .promise();
      })
    );

    console.log("Topics:", sns);

    callback(null, { statusCode: 200 });
  } catch (e) {
    console.log("Lambda failed for data", event, "with error", e);

    callback(null, { statusCode: 500 });
  }
}

exports.handler = handle;
