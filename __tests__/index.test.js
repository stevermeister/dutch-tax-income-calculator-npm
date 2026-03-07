import { parseCsv } from './helper.js';
import { constants, SalaryPaycheck } from '../index.js';

const checkCalculation = async (year, callback) => {
  const csv = await parseCsv(`__tests__/test-tax-${year}.csv`);
  const MAXIMUM_DISCREPANCY = 0.6;
  const ROW_INTERVAL = 25;

  for (let i = 0; i < csv.length; i += ROW_INTERVAL) {
    const data = csv[i];
    // Before retirement age
    const paycheckYounger = new SalaryPaycheck(
      {
        income: data.income,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Month',
      year,
      {
        checked: false,
      }
    );
    data.taxCreditMonth =
      data.youngerWithoutPayrollTaxCredit - data.youngerWithPayrollTaxCredit;
    data.generalCreditMonth = Math.abs(
      data.taxCreditMonth - data.youngerDeductedLabourCredit
    );
    data.netMonth = data.income - data.youngerWithPayrollTaxCredit;
    expect(paycheckYounger.grossMonth).toBeAround(
      data.income,
      MAXIMUM_DISCREPANCY
    );
    expect(Math.abs(paycheckYounger.taxWithoutCreditMonth)).toBeAround(
      data.youngerWithoutPayrollTaxCredit,
      MAXIMUM_DISCREPANCY
    );
    expect(paycheckYounger.taxCreditMonth).toBeAround(
      data.taxCreditMonth,
      MAXIMUM_DISCREPANCY
    );
    expect(Math.abs(paycheckYounger.incomeTaxMonth)).toBeAround(
      data.youngerWithPayrollTaxCredit,
      MAXIMUM_DISCREPANCY
    );
    expect(paycheckYounger.netMonth).toBeAround(
      data.netMonth,
      MAXIMUM_DISCREPANCY
    );

    // After retirement age
    const paycheckOlder = new SalaryPaycheck(
      {
        income: data.income,
        allowance: false,
        socialSecurity: true,
        older: true,
        hours: 40,
      },
      'Month',
      year,
      {
        checked: false,
      }
    );
    data.taxCreditMonth =
      data.olderWithoutPayrollTaxCredit - data.olderWithPayrollTaxCredit;
    data.generalCreditMonth = Math.abs(
      data.taxCreditMonth - data.youngerDeductedLabourCredit
    );
    data.netMonth = data.income - data.olderWithPayrollTaxCredit;
    expect(paycheckOlder.grossMonth).toBeAround(
      data.income,
      MAXIMUM_DISCREPANCY
    );
    expect(Math.abs(paycheckOlder.taxWithoutCreditMonth)).toBeAround(
      data.olderWithoutPayrollTaxCredit,
      MAXIMUM_DISCREPANCY
    );
    expect(paycheckOlder.taxCreditMonth).toBeAround(
      data.taxCreditMonth,
      MAXIMUM_DISCREPANCY
    );
    expect(Math.abs(paycheckOlder.incomeTaxMonth)).toBeAround(
      data.olderWithPayrollTaxCredit,
      MAXIMUM_DISCREPANCY
    );
    expect(paycheckOlder.netMonth).toBeAround(
      data.netMonth,
      MAXIMUM_DISCREPANCY
    );
  }
  callback();
};

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
    test(`calculate tax table for ${year}`, (done) => {
      checkCalculation(year, done);
    });
  });
});

describe('30% ruling with holiday allowance included', () => {
  test('should apply 30% ruling on full gross including holiday allowance', () => {
    const result = new SalaryPaycheck(
      { income: 100000, allowance: true, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    expect(result.taxableYear).toBeCloseTo(70000, 0);
    expect(result.taxFreeYear).toBeCloseTo(30000, 0);
    expect(result.taxFree).toBeCloseTo(30, 0);
  });

  test('should produce consistent results with and without allowance flag', () => {
    const withAllowance = new SalaryPaycheck(
      { income: 108000, allowance: true, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    const withoutAllowance = new SalaryPaycheck(
      { income: 100000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    // 108000 with allowance has same base salary (100000) as 100000 without allowance
    // Both should show 30% tax-free
    expect(withAllowance.taxFree).toBeCloseTo(30, 0);
    expect(withoutAllowance.taxFree).toBeCloseTo(30, 0);
  });

  test('should not apply ruling when allowance=false and ruling unchecked', () => {
    const result = new SalaryPaycheck(
      { income: 100000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: false }
    );

    expect(result.taxFreeYear).toBe(0);
    expect(result.taxableYear).toBe(100000);
  });
});

describe('30% ruling without holiday allowance (allowance=false)', () => {
  test('should add 8% holiday allowance to gross when ruling is applied', () => {
    const result = new SalaryPaycheck(
      { income: 100000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    // Gross should be inflated by 8% to reflect total employment income
    expect(result.grossYear).toBe(108000);
    expect(result.grossAllowance).toBeCloseTo(8000, 0);
    // Original input preserved
    expect(result.inputGrossYear).toBe(100000);
  });

  test('should produce identical results for equivalent salaries with and without allowance', () => {
    const withAllowance = new SalaryPaycheck(
      { income: 108000, allowance: true, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    const withoutAllowance = new SalaryPaycheck(
      { income: 100000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    expect(withoutAllowance.grossYear).toBe(withAllowance.grossYear);
    expect(withoutAllowance.taxFreeYear).toBe(withAllowance.taxFreeYear);
    expect(withoutAllowance.taxableYear).toBe(withAllowance.taxableYear);
    expect(withoutAllowance.incomeTax).toBe(withAllowance.incomeTax);
    expect(withoutAllowance.netYear).toBe(withAllowance.netYear);
    expect(withoutAllowance.netMonth).toBe(withAllowance.netMonth);
  });

  test('should not inflate gross when ruling is unchecked', () => {
    const result = new SalaryPaycheck(
      { income: 100000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: false }
    );

    expect(result.grossYear).toBe(100000);
    expect(result.inputGrossYear).toBe(100000);
    expect(result.grossAllowance).toBe(0);
  });

  test('should work correctly with monthly input', () => {
    const monthly = new SalaryPaycheck(
      { income: 5000, allowance: false, socialSecurity: true, older: false, hours: 40 },
      'Month',
      2026,
      { checked: true, choice: 'normal' }
    );

    const yearlyEquivalent = new SalaryPaycheck(
      { income: 5000 * 12 * 1.08, allowance: true, socialSecurity: true, older: false, hours: 40 },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    expect(monthly.grossYear).toBeCloseTo(yearlyEquivalent.grossYear, 0);
    expect(monthly.netYear).toBeCloseTo(yearlyEquivalent.netYear, 0);
  });
});
