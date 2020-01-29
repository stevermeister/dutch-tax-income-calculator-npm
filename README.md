# dutch-tax-income-calculator-npm
NPM package with functionality to calculate Dutch Tax Income

## Installation

```bash
npm install --save dutch-tax-income-calculator-npm
```

## Usage

```javascript
import { SalaryPaycheck } from 'dutch-tax-income-calculator-npm';

const paycheck = new SalaryPaycheck({
    income: 36000,
    allowance: false,
    socialSecurity: true,
    older: false,
    hours: 40
}, 'Year', 2020, {
    checked: false,
    choice: "normal"
});
console.log(paycheck);
/* OUTPUT:
{
    grossYear: 36000
    grossMonth: 3000
    grossWeek: 692
    grossDay: 138
    grossHour: 17
    taxFreeYear: 0
    grossAllowance: 0
    taxableYear: 36000
    taxFree: 0
    payrollTax: -3848.40
    socialTax: -9597.86
    generalCredit: 1843.81
    labourCredit: 3756.14
    incomeTax: -7846
    incomeTaxMonth: -653
    netYear: 28154
    netAllowance: 0
    netMonth: 2346
    netWeek: 541
    netDay: 108
    netHour: 13
}
*/
```
