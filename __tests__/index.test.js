import { parseCsv } from './helper.js';
import { constants, SalaryPaycheck, netToGross } from '../index.js';

// Asserts that feeding a forward result's net back into netToGross recovers
// the original gross. When rounding makes the gross non-unique, netToGross
// returns a { grossLow, grossHigh } plateau instead of a single result — in
// that case we assert the original gross falls within it.
//
// Some income bands (see issue #85: net income can decrease as gross
// increases for `older` taxpayers near the low-wage credit threshold) have
// more than one gross value producing the same rounded net. Bisection may
// converge on a different, equally valid, root there — accepted as long as
// it truly reproduces the same target net.
const expectRoundTrip = (forward, field, options) => {
  const grossField = field === 'netYear' ? 'grossYear' : 'grossMonth';
  const startFrom = field === 'netYear' ? 'Year' : 'Month';
  const amount = forward[field];
  const reverse = netToGross(
    { amount, field, holidayAllowanceIncluded: false },
    options
  );
  // The 8%-inflation transform (allowance=false + ruling applied) means a
  // reported gross can't safely be fed back in as `income` to reconstruct —
  // that combination isn't expected to hit the non-monotonic bands below.
  const invertible = !(!options.allowance && options.ruling.checked);

  // Independently reconstructs a SalaryPaycheck from an alternate root and
  // confirms it truly reproduces the target net, rather than trusting it.
  const verifyAlternateRoot = (grossCandidate) => {
    const check = new SalaryPaycheck(
      {
        income: grossCandidate,
        allowance: options.allowance,
        socialSecurity: options.socialSecurity,
        older: options.older,
        hours: options.hours,
      },
      startFrom,
      options.year,
      options.ruling
    );
    return check[field] === amount;
  };

  if ('grossLow' in reverse) {
    if (
      forward[grossField] >= reverse.grossLow &&
      forward[grossField] <= reverse.grossHigh
    ) {
      return;
    }
    // Known non-monotonic income band (issue #85: net can decrease as gross
    // increases, e.g. near the `older` low-wage credit threshold). Bisection
    // converged on a different, equally valid, plateau.
    expect(invertible).toBe(true);
    expect(verifyAlternateRoot(reverse.grossHigh)).toBe(true);
    return;
  }

  if (reverse[grossField] === forward[grossField]) {
    return;
  }
  // Same rationale as above, for the single-value case.
  expect(invertible).toBe(true);
  expect(verifyAlternateRoot(reverse[grossField])).toBe(true);
};

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

const checkReverseCalculation = async (year, callback) => {
  const csv = await parseCsv(`__tests__/test-tax-${year}.csv`);
  const ROW_INTERVAL = 25;

  for (let i = 0; i < csv.length; i += ROW_INTERVAL) {
    const data = csv[i];

    for (const older of [false, true]) {
      const forward = new SalaryPaycheck(
        {
          income: data.income,
          allowance: false,
          socialSecurity: true,
          older,
          hours: 40,
        },
        'Month',
        year,
        { checked: false }
      );

      expectRoundTrip(forward, 'netMonth', {
        period: 'Month',
        year,
        allowance: false,
        socialSecurity: true,
        older,
        hours: 40,
        ruling: { checked: false },
      });
    }
  }
  callback();
};

describe('Reverse (net-to-gross) calculation section', () => {
  constants.years.forEach((year) => {
    test(`reverse calculate tax table for ${year}`, (done) => {
      checkReverseCalculation(year, done);
    });
  });
});

describe('30% ruling with holiday allowance included', () => {
  test('should apply 30% ruling on full gross including holiday allowance', () => {
    const result = new SalaryPaycheck(
      {
        income: 100000,
        allowance: true,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
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
      {
        income: 108000,
        allowance: true,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    const withoutAllowance = new SalaryPaycheck(
      {
        income: 100000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
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
      {
        income: 100000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
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
      {
        income: 100000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
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
      {
        income: 108000,
        allowance: true,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    const withoutAllowance = new SalaryPaycheck(
      {
        income: 100000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
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
      {
        income: 100000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: false }
    );

    expect(result.grossYear).toBe(100000);
    expect(result.inputGrossYear).toBe(100000);
    expect(result.grossAllowance).toBe(0);
  });

  test('should not inflate gross when income is below ruling threshold', () => {
    const result = new SalaryPaycheck(
      {
        income: 30000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    // Below threshold — ruling doesn't apply, gross should NOT be inflated
    expect(result.grossYear).toBe(30000);
    expect(result.taxFreeYear).toBe(0);
    expect(result.grossAllowance).toBe(0);
  });

  test('should work correctly with monthly input', () => {
    const monthly = new SalaryPaycheck(
      {
        income: 5000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Month',
      2026,
      { checked: true, choice: 'normal' }
    );

    const yearlyEquivalent = new SalaryPaycheck(
      {
        income: 5000 * 12 * 1.08,
        allowance: true,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Year',
      2026,
      { checked: true, choice: 'normal' }
    );

    expect(monthly.grossYear).toBeCloseTo(yearlyEquivalent.grossYear, 0);
    expect(monthly.netYear).toBeCloseTo(yearlyEquivalent.netYear, 0);
  });
});

describe('Reverse (net-to-gross) calculation for 30% ruling scenarios', () => {
  // Same (income, allowance, ruling) combinations exercised by the two
  // describe blocks above — reused here rather than invented.
  const scenarios = [
    {
      income: 100000,
      allowance: true,
      ruling: { checked: true, choice: 'normal' },
    },
    {
      income: 108000,
      allowance: true,
      ruling: { checked: true, choice: 'normal' },
    },
    {
      income: 100000,
      allowance: false,
      ruling: { checked: true, choice: 'normal' },
    },
    { income: 100000, allowance: false, ruling: { checked: false } },
    {
      income: 30000,
      allowance: false,
      ruling: { checked: true, choice: 'normal' },
    },
  ];

  scenarios.forEach(({ income, allowance, ruling }) => {
    test(`recovers gross for income=${income} allowance=${allowance} ruling.checked=${ruling.checked}`, () => {
      const forward = new SalaryPaycheck(
        { income, allowance, socialSecurity: true, older: false, hours: 40 },
        'Year',
        2026,
        ruling
      );

      expectRoundTrip(forward, 'netYear', {
        period: 'Year',
        year: 2026,
        allowance,
        socialSecurity: true,
        older: false,
        hours: 40,
        ruling,
      });
    });
  });

  test('recovers gross for monthly input (income=5000, ruling applied)', () => {
    const forward = new SalaryPaycheck(
      {
        income: 5000,
        allowance: false,
        socialSecurity: true,
        older: false,
        hours: 40,
      },
      'Month',
      2026,
      { checked: true, choice: 'normal' }
    );

    expectRoundTrip(forward, 'netMonth', {
      period: 'Month',
      year: 2026,
      allowance: false,
      socialSecurity: true,
      older: false,
      hours: 40,
      ruling: { checked: true, choice: 'normal' },
    });
  });
});
