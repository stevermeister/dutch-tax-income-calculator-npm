const { parseCsv } = require('./helper');
const { constants, SalaryPaycheck } = require('../index');

  const checkCalculation = async (year, callback) => {
    const csv = await parseCsv(`__tests__/test-tax-${year}.csv`);
    const MAXIMUM_DISCREPANCY = 0.6;
    const ROW_INTERVAL = 25;

    for (let i = 0; i < csv.length; i += ROW_INTERVAL) {
      const data = csv[i];
      // Before retirement age
      const paycheckYounger = this.createPaycheck(data, 'Month', year, false);
      this.calculateCredits(data);
      this.checkExpectations(paycheckYounger, data, MAXIMUM_DISCREPANCY);
    }
    // After retirement age
    const paycheckOlder = new SalaryPaycheck({
      income: data.income,
      allowance: false,
      socialSecurity: true,
      older: true,
      hours: 40,
    }, 'Month', year, {
      checked: false,
    });
    data.taxCreditMonth = data.olderWithoutPayrollTaxCredit - data.olderWithPayrollTaxCredit;
    data.generalCreditMonth = Math.abs(data.taxCreditMonth - data.youngerDeductedLabourCredit);
    data.netMonth = data.income - data.olderWithPayrollTaxCredit;
    try {
      expect(paycheckOlder.grossMonth).toBeAround(data.income, MAXIMUM_DISCREPANCY);
      expect(Math.abs(paycheckOlder.taxWithoutCreditMonth)).toBeAround(data.olderWithoutPayrollTaxCredit, MAXIMUM_DISCREPANCY);
      expect(paycheckOlder.taxCreditMonth).toBeAround(data.taxCreditMonth, MAXIMUM_DISCREPANCY);
      // expect(paycheckOlder.labourCreditMonth).toBeAround(data.olderDeductedLabourCredit, MAXIMUM_DISCREPANCY);
      // expect(paycheckOlder.generalCreditMonth).toBeAround(data.generalCreditMonth, MAXIMUM_DISCREPANCY);
      expect(Math.abs(paycheckOlder.incomeTaxMonth)).toBeAround(data.olderWithPayrollTaxCredit, MAXIMUM_DISCREPANCY);
      expect(paycheckOlder.netMonth).toBeAround(data.netMonth, MAXIMUM_DISCREPANCY);
    } catch (err) {
      //console.debug({ year, row: data, paycheck: paycheckOlder });
      throw err;
    }
  }
  callback();
}

test('check constants JSON data', () => {
  expect(constants).toHaveProperty('currentYear');
  expect(constants).toHaveProperty('years');
  expect(constants).toHaveProperty('rulingThreshold');
  expect(constants).toHaveProperty('payrollTax');
  expect(constants).toHaveProperty('socialPercent');
  expect(constants).toHaveProperty('generalCredit');
  expect(constants).toHaveProperty('labourCredit');
});

// https://www.belastingdienst.nl/wps/wcm/connect/nl/personeel-en-loon/content/hulpmiddel-loonbelastingtabellen
describe('Tax calculation section', () => {
  constants.years.forEach((year) => {
    test(`calculate tax table for ${year}`, done => {
      checkCalculation(year, done);
    });
  });
});
