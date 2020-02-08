const csv = require('csv-parser');
const fs = require('fs');
const { EXPECTED_COLOR, RECEIVED_COLOR, stringify } = require('jest-matcher-utils');

expect.extend({
  toBeAround(actual, expected, difference = 0.1) {
    const receivedDiff = Math.abs(expected - actual);
    const pass = receivedDiff < difference;
    const receivedDiffString = stringify(receivedDiff);
    const expectedDiffString = stringify(difference);
    return {
      message: () => {
        return (
          `Expected: ${EXPECTED_COLOR(stringify(expected))}\n` +
          `Received: ${RECEIVED_COLOR(stringify(actual))}\n\n` +
          `Expected difference: ${pass ? 'not ' : ''}< ${EXPECTED_COLOR(
            expectedDiffString,
          )}\n` +
          `Received difference: ${pass ? '    ' : ''}  ${RECEIVED_COLOR(
            receivedDiffString,
          )}`
        );
      },
      pass
    }
  }
});

const parseCsv = (filePath) => {
  return new Promise((resolve, reject) => {
      const result = [];
      fs.createReadStream(filePath)
        .pipe(csv({
          mapValues: ({ value }) => parseFloat(value)
        }))
        .on('data', (data) => result.push(data))
        .on('end', () => resolve(result))
        .on('error', reject);
  });
};

module.exports = {
  parseCsv,
};
