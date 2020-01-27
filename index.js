const constants = require("./data.json"); // Get JSON containing calculation constants

// income: 36000,
let grossYear = 36000;
let year = 2020;
let older = false;
let hours = constants.defaultWorkingHours;
let ruling = {
  checked: false,
  choice: "normal"
};

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
    + getSocialCredit(year, older) * getGeneralCredit(year, taxableYear, older)
    + getSocialCredit(year, older) * getLabourCredit(year, taxableYear, older) 
    - getPayrollTax(year, taxableYear) 
    - getSocialTax(year, taxableYear, older));
  incomeTax = incomeTax < 0 ? incomeTax : 0;
  return ~~taxableYear + incomeTax + ~~taxFreeYear;
}

function getNetMonth(grossYear, ruling, older = false, year = 2020) {
  return ~~(getNetYear(grossYear, ruling, older, year) / 12);
}

function getNetWeek(grossYear, ruling, older = false, year = 2020) {
  return ~~(getNetYear(grossYear, ruling, older, year) / constants.workingWeeks);
}

function getNetDay(grossYear, ruling, older = false, year = 2020) {
  return ~~(getNetYear(grossYear, ruling, older, year) / constants.workingDays);
}

function getNetHour(grossYear, ruling, older = false, year = 2020, hours) {
  return ~~(getNetYear(grossYear, ruling, older, year) / (constants.workingWeeks * hours));
}

// 30% Ruling (30%-regeling)
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_wonen/tijdelijk_in_een_ander_land_werken/u_komt_in_nederland_werken/30_procent_regeling/voorwaarden_30_procent_regeling/u_hebt_een_specifieke_deskundigheid
function getRulingIncome(year, ruling) {
  return constants.rulingThreshold[year][ruling];
}

// Payroll Tax Rates (Loonbelasting)
// https://www.belastingdienst.nl/bibliotheek/handboeken/html/boeken/HL/stappenplan-stap_7_loonbelasting_premie_volksverzekeringen.html
function getPayrollTax(year, salary) {
  return getRates(constants.payrollTax[year], salary, "rate");
}

// Social Security Contribution (Volksverzekeringen - AOW, Anw, Wlz)
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/volksverzekeringen?projectid=98f8c360-e92a-4fe2-aea6-27e9087ce4a1&projectid=98f8c360-e92a-4fe2-aea6-27e9087ce4a1
function getSocialTax(year, salary, older) {
  return getRates(
    constants.socialPercent[year],
    salary,
    older ? "older" : "social"
  );
}

// General Tax Credit (Algemene Heffingskorting)
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/algemene_heffingskorting/
function getGeneralCredit(year, salary) {
  return getRates(constants.generalCredit[year], salary, "rate");
}

// Labour Tax Credit (Arbeidskorting)
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/
function getLabourCredit(year, salary) {
  return getRates(constants.labourCredit[year], salary, "rate");
}

// Social Security Contribution (Volksverzekeringen) Component of Tax Credit
// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/fiscale_regelingen/sociale_zekerheid_bij_grensoverschrijdend_werken_en_ondernemen/hoe_wordt_de_premie_berekend/berekening_premie_volksverzekeringen_heffingskorting_deel_van_het_jaar_premieplichtig/heffingskortingen/
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

// https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/handboek-loonheffingen-2017
function getRates(brackets, salary, type) {
  let amount = 0,
    tax,
    delta,
    percent;

  brackets.some((bracket, index) => {
    delta = bracket.max ? bracket.max - bracket.min : Infinity; // Consider infinity when no upper bound
    tax = type && bracket[type] ? bracket[type] : bracket["rate"];
    percent = tax != 0 && tax > -1 && tax < 1; // Check if rate is percentage or fixed
    if (salary <= delta) {
      if (percent) {
        amount += Math.trunc(salary * 100 * tax) / 100; // Round down at 2 decimal places
      } else {
        amount = tax;
      }
      //console.log(index, salary, delta, tax, percent, amount);
      return true; // Break loop when reach last bracket
    } else {
      if (percent) {
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



console.log(getNetMonth(grossYear, ruling, older, year));