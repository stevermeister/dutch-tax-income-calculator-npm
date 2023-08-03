const constants = require('./data.json');

class SalaryPaycheck {
  /**
   * For calculation instructions:
   * https://www.belastingdienst.nl/wps/wcm/connect/nl/zoeken/zoeken?q=Rekenvoorschriften+voor+de+geautomatiseerde+loonadministratie
   * 
   * @param {object} salaryInput Salary input information
   * @param {'Year'|'Month'|'Week'|'Day'|'Hour'} startFrom Salary input information
   * @param {number} year Year to perform calculation
   * @param {object} ruling Salary input information
   * @returns {object} Object with all calculated fields for the salary paycheck
   */
  constructor(salaryInput, startFrom, year, ruling) {
    const { income, allowance, socialSecurity, older, hours } = salaryInput;
    this.initializeGrossValues();
    this.setGrossValue(startFrom, income);
    let grossYear = this.calculateGrossYear(hours);
    grossYear = this.validateGrossYear(grossYear);

    this.grossAllowance = (allowance) ? SalaryPaycheck.getHolidayAllowance(grossYear) : 0;
    this.grossYear = roundNumber(grossYear, 2);
    this.grossMonth = SalaryPaycheck.getAmountMonth(grossYear);
    this.grossWeek = SalaryPaycheck.getAmountWeek(grossYear);
    this.grossDay = SalaryPaycheck.getAmountDay(grossYear);
    this.grossHour = SalaryPaycheck.getAmountHour(grossYear, hours);

    this.taxFreeYear = 0;
    this.taxableYear = grossYear - this.grossAllowance;

    if (ruling.checked) {
      let rulingIncome = SalaryPaycheck.getRulingIncome(year, ruling.choice);
      // the 30% of taxableYear is untaxed
      // UNLESS this brings taxableYear under the rulingIncome
      // in which case cap the effectiveSalary to rulingIncome
      let effectiveSalary = this.taxableYear * 0.7;
      effectiveSalary = Math.max(effectiveSalary, rulingIncome);
      let reimbursement = this.taxableYear - effectiveSalary;
      if (reimbursement > 0) {
        this.taxFreeYear = reimbursement;
        this.taxableYear = this.taxableYear - reimbursement;
      }
    }

    this.taxFreeYear = roundNumber(this.taxFreeYear, 2);
    this.taxFree = SalaryPaycheck.getTaxFree(this.taxFreeYear, grossYear);
    this.taxableYear = roundNumber(this.taxableYear, 2);
    this.payrollTax = -1 * SalaryPaycheck.getPayrollTax(year, this.taxableYear);
    this.payrollTaxMonth = SalaryPaycheck.getAmountMonth(this.payrollTax);
    this.socialTax = (socialSecurity) ? -1 * SalaryPaycheck.getSocialTax(year, this.taxableYear, older) : 0;
    this.socialTaxMonth = SalaryPaycheck.getAmountMonth(this.socialTax);
    this.taxWithoutCredit = roundNumber(this.payrollTax + this.socialTax, 2);
    this.taxWithoutCreditMonth = SalaryPaycheck.getAmountMonth(this.taxWithoutCredit);
    let socialCredit = SalaryPaycheck.getSocialCredit(year, older, socialSecurity);
    this.labourCredit = SalaryPaycheck.getLabourCredit(year, this.taxableYear, socialCredit);
    this.labourCreditMonth = SalaryPaycheck.getAmountMonth(this.labourCredit);
    this.generalCredit = SalaryPaycheck.getGeneralCredit(year, this.taxableYear, older, socialCredit);
    if (this.taxWithoutCredit + this.labourCredit + this.generalCredit > 0
        || (older && this.taxableYear < constants.lowWageThreshold[year] / socialCredit)) {
      this.generalCredit = -1 * (this.taxWithoutCredit + this.labourCredit);
    }
    this.generalCreditMonth = SalaryPaycheck.getAmountMonth(this.generalCredit);
    this.taxCredit = roundNumber(this.labourCredit + this.generalCredit, 2);
    this.taxCreditMonth = SalaryPaycheck.getAmountMonth(this.taxCredit);
    this.incomeTax = roundNumber(this.taxWithoutCredit + this.taxCredit, 2);
    this.incomeTaxMonth = SalaryPaycheck.getAmountMonth(this.incomeTax);
    this.netYear = this.taxableYear + this.incomeTax + this.taxFreeYear;
    this.netAllowance = (allowance) ? SalaryPaycheck.getHolidayAllowance(this.netYear) : 0;
    //this.netYear -= this.netAllowance; // Remove holiday allowance from annual net amount
    this.netMonth = SalaryPaycheck.getAmountMonth(this.netYear);
    this.netWeek = SalaryPaycheck.getAmountWeek(this.netYear);
    this.netDay = SalaryPaycheck.getAmountDay(this.netYear);
    this.netHour = SalaryPaycheck.getAmountHour(this.netYear, hours);
  }

  static getHolidayAllowance(amountYear) {
    return roundNumber(amountYear * (0.08 / 1.08), 2); // Vakantiegeld (8%)
  }

  static getTaxFree(taxFreeYear, grossYear) {
    return roundNumber(taxFreeYear / grossYear * 100, 2);
  }

  static getNetYear(taxableYear, incomeTax, taxFreeYear) {
    return roundNumber(taxableYear + incomeTax + taxFreeYear, 2);
  }

  static getAmountMonth(amountYear) {
    return roundNumber(amountYear / 12, 2);
  }

  static getAmountWeek(amountYear) {
    return roundNumber(amountYear / constants.workingWeeks, 2);
  }

  static getAmountDay(amountYear) {
    return roundNumber(amountYear / constants.workingDays, 2);
  }

  static getAmountHour(amountYear, hours) {
    return roundNumber(amountYear / (constants.workingWeeks * hours), 2);
  }

  /**
   * 30% Ruling (30%-regeling)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_wonen/tijdelijk_in_een_ander_land_werken/u_komt_in_nederland_werken/30_procent_regeling/voorwaarden_30_procent_regeling/u-hebt-een-specifieke-deskundigheid
   * 
   * @param {string} year Year to retrieve information from
   * @param {string} ruling Choice between scientific research workers, young professionals with Master's degree or others cases
   * @returns {number} The 30% Ruling minimum income
   */
  static getRulingIncome(year, ruling) {
    return constants.rulingThreshold[year][ruling];
  }

  /**
   * Payroll Tax Rates (Loonbelasting)
   * https://www.belastingdienst.nl/bibliotheek/handboeken/html/boeken/HL/stappenplan-stap_7_loonbelasting_premie_volksverzekeringen.html
   * 
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @returns {number} The Payroll Tax Rates after calculating proper bracket amount
   */
  static getPayrollTax(year, salary) {
    return SalaryPaycheck.getRates(constants.payrollTax[year], salary, "rate");
  }

  /**
   * Social Security Contribution (Volksverzekeringen - AOW, Anw, Wlz)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/volksverzekeringen
   * 
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {string} [older] Whether is after retirement age or not
   * @returns {number} The Social Security Contribution after calculating proper bracket amount
   */
  static getSocialTax(year, salary, older) {
    return SalaryPaycheck.getRates(
      constants.socialPercent[year],
      salary,
      older ? "older" : "social"
    );
  }

  /**
   * General Tax Credit (Algemene Heffingskorting)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/algemene_heffingskorting/
   * 
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {boolean} older Whether is after retirement age or not
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} The General Tax Credit after calculating proper bracket amount
   */
  static getGeneralCredit(year, salary, older, multiplier = 1) {
    let generalCredit = SalaryPaycheck.getRates(constants.generalCredit[year], salary, "rate", multiplier);
    // Additional credit for worker that reached retirement age
    if (older) {
      generalCredit += SalaryPaycheck.getRates(constants.elderCredit[year], salary, "rate");
    }
    return generalCredit;
  }

  /**
   * Labour Tax Credit (Arbeidskorting)
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/
   * 
   * @param {string} year Year to retrieve information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} The Labour Tax Credit after calculating proper bracket amount
   */
  static getLabourCredit(year, salary, multiplier = 1) {
    // TODO: this low wage threshold should be confirmed
    if (salary < constants.lowWageThreshold[year] / multiplier) {
      return 0;
    }
    return SalaryPaycheck.getRates(constants.labourCredit[year], salary, "rate", multiplier);
  }

  /**
   * Social Security Contribution (Volksverzekeringen) Component of Tax Credit
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/hoeveel_moet_u_betalen
   * 
   * @param {string} year Year to retrieve information from
   * @param {boolean} older Whether is after retirement age or not
   * @param {boolean} socialSecurity Whether social security will be considered or not
   * @returns {number} Social Security contribution percentage to apply to wage credit
   */
  static getSocialCredit(year, older, socialSecurity) {
    /*
    * JSON properties for socialPercent object
    * rate: Higher full rate including social contributions to be used to get proportion
    * social: Percentage of social contributions (AOW + Anw + Wlz)
    * older: Percentage for retirement age (Anw + Wlz, no contribution to AOW)
    */
    let bracket = constants.socialPercent[year][0],
      percentage = 1;
    if (!socialSecurity) {
      percentage = (bracket.rate - bracket.social) / bracket.rate; // Removing AOW + Anw + Wlz from total
    } else if (older) {
      percentage = (bracket.rate + bracket.older - bracket.social) / bracket.rate; // Removing only AOW from total
    }
    return percentage;
  }

  /**
   * Get right amount based on the rate brackets passed
   * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/nieuwsbrief-loonheffingen-2020
   *
   * @param {object[]} brackets Rate brackets to extract information from
   * @param {number} salary Taxable wage that will be used for calculation
   * @param {string} kind Property name to be extracted from bracket
   * @param {number} [multiplier] Scalar value to multiple against final result
   * @returns {number} Accumulated tax/credit amount to be used to calculate the net income
   */
  static getRates(brackets, salary, kind, multiplier = 1) {
    let amount = 0,
      tax,
      delta,
      isPercent;

    brackets.some((bracket, index) => {
      delta = bracket.max ? bracket.max - bracket.min : Infinity; // Consider infinity when no upper bound
      tax =
        Math.round(
          multiplier *
            (kind && bracket[kind] ? bracket[kind] : bracket["rate"]) *
            100000
        ) / 100000;
      isPercent = tax != 0 && tax > -1 && tax < 1; // Check if rate is percentage or fixed
      if (salary <= delta) {
        if (isPercent) {
          amount += roundNumber(salary * tax, 2); // Round down at 2 decimal places
        } else {
          amount = tax;
        }
        amount = roundNumber(amount, 2);
        return true; // Break loop when reach last bracket
      } else {
        if (isPercent) {
          amount += roundNumber(delta * tax, 2);
        } else {
          amount = tax;
        }
        salary -= delta;
      }
    });
    return amount;
  }
}

/**
 * Round a number to the specified decimal places
 *
 * @param {number} value Amount to be rounded
 * @param {number} [places] Decimal places to rounded
 */
const roundNumber = (value, places = 2) => {
  return Number(value.toFixed(places));
}

module.exports = {
  SalaryPaycheck,
  constants,
}
