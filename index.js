const constants = require("./data.json"); // Get JSON containing calculation constants

// For calculation instructions:
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/rekenvoorschriften-voor-de-geautomatiseerde-loonadministratie-januari-2017

function getNetYear(grossYear, ruling, older, year = 2020) {
  let taxFreeYear = 0;
  let taxableYear = grossYear;
  if (ruling.checked) {
    let rulingIncome = getRulingIncome(year, ruling.choice);
    // the 30% of taxableYear is untaxed
    // UNLESS this brings taxableYear under the rulingIncome
    // in which case cap the effectiveSalary to rulingIncome
    let effectiveSalary = taxableYear * 0.7;
    effectiveSalary = Math.max(effectiveSalary, rulingIncome);
    let reimbursement = taxableYear - effectiveSalary;
    if (reimbursement > 0) {
      taxFreeYear = reimbursement;
      taxableYear = taxableYear - reimbursement;
    }
  }

  let incomeTax = ~~(
    + getGeneralCredit(year, taxableYear, getSocialCredit(year, older))
    + getLabourCredit(year, taxableYear, getSocialCredit(year, older))
    - getPayrollTax(year, taxableYear)
    - getSocialTax(year, taxableYear, older)
  );
  incomeTax = incomeTax < 0 ? incomeTax : 0;
  return ~~taxableYear + incomeTax + ~~taxFreeYear;
}

function getNetMonth(grossYear, ruling, older = false, year = 2020) {
  return ~~(getNetYear(grossYear, ruling, older, year) / 12);
}

function getNetWeek(grossYear, ruling, older = false, year = 2020) {
  return ~~(
    getNetYear(grossYear, ruling, older, year) / constants.workingWeeks
  );
}

function getNetDay(grossYear, ruling, older = false, year = 2020) {
  return ~~(getNetYear(grossYear, ruling, older, year) / constants.workingDays);
}

function getNetHour(grossYear, ruling, older = false, year = 2020, hours) {
  return ~~(
    getNetYear(grossYear, ruling, older, year) /
    (constants.workingWeeks * hours)
  );
}

/**
 * 30% Ruling (30%-regeling)
 * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_wonen/tijdelijk_in_een_ander_land_werken/u_komt_in_nederland_werken/30_procent_regeling/voorwaarden_30_procent_regeling/u-hebt-een-specifieke-deskundigheid
 * 
 * @param {string} year Year to retrieve information from
 * @param {string} ruling Choice between scientific research workers, young professionals with Master's degree or others cases
 * @returns {number} The 30% Ruling minimum income
 */
function getRulingIncome(year, ruling) {
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
function getPayrollTax(year, salary) {
  return getRates(constants.payrollTax[year], salary, "rate");
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
function getSocialTax(year, salary, older) {
  return getRates(
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
 * @param {number} [multiplier] Scalar value to multiple against final result
 * @returns {number} The General Tax Credit after calculating proper bracket amount
 */
function getGeneralCredit(year, salary, multiplier = 1) {
  return getRates(constants.generalCredit[year], salary, "rate", multiplier);
}

/**
 * Labour Tax Credit (Arbeidskorting)
 * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/
 * 
 * @param {string} year Year to retrieve information from
 * @param {number} salary Taxable wage that will be used for calculation
 * @param {number} [multiplier] Scalar value to multiple against final result
 * @returns {number} The Labout Tax Credit after calculating proper bracket amount
 */
function getLabourCredit(year, salary, multiplier = 1) {
  return getRates(constants.labourCredit[year], salary, "rate", multiplier);
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
function getSocialCredit(year, older) {
  /*
   * JSON properties for socialPercent object
   * rate: Higher full rate including social contributions to be used to get proportion
   * social: Percentage of social contributions (AOW + Anw + Wlz)
   * older: Percentage for retirement age (Anw + Wlz, no contribution to AOW)
   */
  let bracket = constants.socialPercent[year][0],
    percentage = 1;
  if (older) {
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
function getRates(brackets, salary, kind, multiplier = 1) {
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
        amount += Math.trunc(salary * 100 * tax) / 100; // Round down at 2 decimal places
      } else {
        amount = tax;
      }
      //console.log(index, salary, delta, tax, isPercent, amount);
      return true; // Break loop when reach last bracket
    } else {
      if (isPercent) {
        amount += delta * tax;
      } else {
        amount = tax;
      }
      salary -= delta;
    }
  });
  return amount;
}

exports.getNetYear = getNetYear;
exports.getNetMonth = getNetMonth;
exports.getNetWeek = getNetWeek;
exports.getNetDay = getNetDay;
exports.getNetHour = getNetHour;
exports.getRulingIncome = getRulingIncome;
exports.getPayrollTax = getPayrollTax;
exports.getGeneralCredit = getGeneralCredit;
exports.getLabourCredit = getLabourCredit;
exports.getSocialCredit = getSocialCredit;
exports.getRates = getRates;




// QUICK TEST
let grossYear = 36000;
let year = 2020;
let older = false;
let ruling = {
  checked: false,
  choice: "normal"
};

console.log(getNetMonth(grossYear, ruling, older, year));
