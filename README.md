# dutch-tax-income-calculator-npm
NPM package with functionality to calculate Dutch Tax Income

## Installation

```bash
npm install --save dutch-tax-income-calculator
```

## Usage

The package exports three members: `SalaryPaycheck` (gross → net), `netToGross` (net → gross), and `constants` (the underlying tax tables).

### Gross to net (`SalaryPaycheck`)

```javascript
import { SalaryPaycheck } from 'dutch-tax-income-calculator';

const paycheck = new SalaryPaycheck(
  {
    income: 36000,
    allowance: false,
    socialSecurity: true,
    older: false,
    hours: 40,
  },
  'Year',
  2026,
  { checked: false }
);
console.log(paycheck);
/* OUTPUT:
{
  grossHour: 17.31,
  grossDay: 141.18,
  grossWeek: 692.31,
  grossMonth: 3000,
  grossYear: 36000,
  inputGrossYear: 36000,
  taxFreeYear: 0,
  grossAllowance: 0,
  taxableYear: 36000,
  taxFree: 0,
  payrollTax: -2916,
  payrollTaxMonth: -243,
  socialTax: -9954,
  socialTaxMonth: -829.5,
  taxWithoutCredit: -12870,
  taxWithoutCreditMonth: -1072.5,
  labourCredit: 5498.04,
  labourCreditMonth: 458.17,
  generalCredit: 2714.29,
  generalCreditMonth: 226.19,
  taxCredit: 8212.33,
  taxCreditMonth: 684.36,
  incomeTax: -4657.67,
  incomeTaxMonth: -388.14,
  netYear: 31342.33,
  netAllowance: 0,
  netMonth: 2611.86,
  netWeek: 602.74,
  netDay: 122.91,
  netHour: 15.07
}
*/
```

`new SalaryPaycheck(salaryInput, startFrom, year, ruling)`:

- `salaryInput.income`: gross amount, denominated in whatever unit `startFrom` specifies
- `salaryInput.allowance`: whether `income` already includes the 8% holiday allowance (vakantiegeld)
- `salaryInput.socialSecurity`: whether social security contributions apply
- `salaryInput.older`: whether the person has reached retirement (AOW) age
- `salaryInput.hours`: contracted hours per week
- `startFrom`: `'Year' | 'Month' | 'Week' | 'Day' | 'Hour'` — which unit `income` is expressed in
- `year`: tax year to calculate for (see `constants.years` for supported years)
- `ruling`: `{ checked: boolean, choice?: 'normal' | 'young' | 'research' }` — the 30% ruling (30%-regeling)

### Net to gross (`netToGross`)

Given a target net income, finds the gross salary that produces it:

```javascript
import { netToGross } from 'dutch-tax-income-calculator';

const result = netToGross(
  {
    amount: 31342.33,
    field: 'netYear',
    holidayAllowanceIncluded: false,
  },
  {
    period: 'Year',
    year: 2026,
    allowance: false,
    socialSecurity: true,
    older: false,
    hours: 40,
    ruling: { checked: false },
  }
);
console.log(result.grossYear); // 36000
```

`netToGross(target, options)`:

- `target.amount`: the net figure to solve for
- `target.field`: `'netYear' | 'netMonth'` — which net field `amount` refers to
- `target.holidayAllowanceIncluded`: whether `amount` already includes the holiday allowance payout (`netAllowance`)
- `options`: the same shape `SalaryPaycheck` accepts, except `period` replaces `startFrom` and must match `target.field` (`'Year'` for `netYear`, `'Month'` for `netMonth`)

`netToGross` returns the full `SalaryPaycheck` result computed at the solved gross — the same shape as the forward calculation above. Because every internal amount is rounded to 2 decimals, more than one gross value can occasionally round to the identical net; in that case `netToGross` returns `{ grossLow, grossHigh }` (the plateau bounds) instead of guessing a single number. If no gross produces the target net, it throws an error naming the nearest achievable net.

### Constants

```javascript
import { constants } from 'dutch-tax-income-calculator';
```

Exposes the underlying tax tables and thresholds used for the calculation — `years`, `rulingThreshold`, `rulingMaxSalary`, `lowWageThreshold`, `payrollTax`, `socialPercent`, `generalCredit`, `labourCredit`, and more (see `data.json`).
