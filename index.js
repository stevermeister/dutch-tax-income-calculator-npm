import constants from './data.json' with { type: 'json' };

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
    let { income, allowance, socialSecurity, older, hours } = salaryInput;
    this.grossYear =
      this.grossMonth =
      this.grossWeek =
      this.grossDay =
      this.grossHour =
        0;
    this['gross' + startFrom] = income;
    let grossYear =
      this.grossYear +
      this.grossMonth * 12 +
      this.grossWeek * constants.workingWeeks;
    grossYear +=
      this.grossDay * constants.workingDays +
      this.grossHour * constants.workingWeeks * hours;
    if (!grossYear || grossYear < 0) {
      grossYear = 0;
    }

    // Store the original input before any adjustments
    this.inputGrossYear = roundNumber(grossYear, 2);

    // When salary doesn't include holiday allowance but 30% ruling is applied,
    // add 8% to get total employment income (ruling applies to total comp)
    let grossInflated = false;
    if (!allowance && ruling.checked) {
      grossYear = roundNumber(grossYear * 1.08, 2);
      allowance = true;
      grossInflated = true;
    }

    this.taxFreeYear = 0;

    if (ruling.checked) {
      let rulingIncome = SalaryPaycheck.getRulingIncome(year, ruling.choice);
      let rulingMaxSalary = constants.rulingMaxSalary[year];
      // 30% ruling applies to full gross (including holiday allowance)
      let salaryEligibleForRuling = Math.min(grossYear, rulingMaxSalary);
      let salaryAboveCap = Math.max(0, grossYear - rulingMaxSalary);
      // Calculate the 30% on eligible salary only
      let effectiveSalary = salaryEligibleForRuling * 0.7 + salaryAboveCap;
      effectiveSalary = Math.max(effectiveSalary, rulingIncome);
      let reimbursement = grossYear - effectiveSalary;
      if (reimbursement > 0) {
        this.taxFreeYear = reimbursement;
      } else if (grossInflated) {
        // Ruling doesn't apply — revert the 8% inflation
        grossYear = this.inputGrossYear;
        allowance = false;
        grossInflated = false;
      }
    }

    this.grossAllowance = allowance
      ? SalaryPaycheck.getHolidayAllowance(grossYear)
      : 0;
    this.grossYear = roundNumber(grossYear, 2);
    this.grossMonth = SalaryPaycheck.getAmountMonth(grossYear);
    this.grossWeek = SalaryPaycheck.getAmountWeek(grossYear);
    this.grossDay = SalaryPaycheck.getAmountDay(grossYear);
    this.grossHour = SalaryPaycheck.getAmountHour(grossYear, hours);
    this.taxableYear =
      this.taxFreeYear > 0
        ? grossYear - this.taxFreeYear
        : grossYear - this.grossAllowance;

    this.taxFreeYear = roundNumber(this.taxFreeYear, 2);
    this.taxFree = SalaryPaycheck.getTaxFree(this.taxFreeYear, grossYear);
    this.taxableYear = roundNumber(this.taxableYear, 2);
    this.payrollTax = -1 * SalaryPaycheck.getPayrollTax(year, this.taxableYear);
    this.payrollTaxMonth = SalaryPaycheck.getAmountMonth(this.payrollTax);
    this.socialTax = socialSecurity
      ? -1 * SalaryPaycheck.getSocialTax(year, this.taxableYear, older)
      : 0;
    this.socialTaxMonth = SalaryPaycheck.getAmountMonth(this.socialTax);
    this.taxWithoutCredit = roundNumber(this.payrollTax + this.socialTax, 2);
    this.taxWithoutCreditMonth = SalaryPaycheck.getAmountMonth(
      this.taxWithoutCredit
    );
    let socialCredit = SalaryPaycheck.getSocialCredit(
      year,
      older,
      socialSecurity
    );
    this.labourCredit = SalaryPaycheck.getLabourCredit(
      year,
      this.taxableYear,
      socialCredit
    );
    this.labourCreditMonth = SalaryPaycheck.getAmountMonth(this.labourCredit);
    this.generalCredit = SalaryPaycheck.getGeneralCredit(
      year,
      this.taxableYear,
      older,
      socialCredit
    );
    if (
      this.taxWithoutCredit + this.labourCredit + this.generalCredit > 0 ||
      (older &&
        this.taxableYear < constants.lowWageThreshold[year] / socialCredit)
    ) {
      this.generalCredit = -1 * (this.taxWithoutCredit + this.labourCredit);
    }
    this.generalCreditMonth = SalaryPaycheck.getAmountMonth(this.generalCredit);
    this.taxCredit = roundNumber(this.labourCredit + this.generalCredit, 2);
    this.taxCreditMonth = SalaryPaycheck.getAmountMonth(this.taxCredit);
    this.incomeTax = roundNumber(this.taxWithoutCredit + this.taxCredit, 2);
    this.incomeTaxMonth = SalaryPaycheck.getAmountMonth(this.incomeTax);
    this.netYear = this.taxableYear + this.incomeTax + this.taxFreeYear;
    this.netAllowance = allowance
      ? SalaryPaycheck.getHolidayAllowance(this.netYear)
      : 0;
    this.netMonth = SalaryPaycheck.getAmountMonth(this.netYear);
    this.netWeek = SalaryPaycheck.getAmountWeek(this.netYear);
    this.netDay = SalaryPaycheck.getAmountDay(this.netYear);
    this.netHour = SalaryPaycheck.getAmountHour(this.netYear, hours);
  }

  static getHolidayAllowance(amountYear) {
    return roundNumber(amountYear * (0.08 / 1.08), 2); // Vakantiegeld (8%)
  }

  static getTaxFree(taxFreeYear, grossYear) {
    return roundNumber((taxFreeYear / grossYear) * 100, 2);
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
    return SalaryPaycheck.getRates(constants.payrollTax[year], salary, 'rate');
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
      older ? 'older' : 'social'
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
    let generalCredit = SalaryPaycheck.getRates(
      constants.generalCredit[year],
      salary,
      'rate',
      multiplier
    );
    // Additional credit for worker that reached retirement age
    if (older) {
      generalCredit += SalaryPaycheck.getRates(
        constants.elderCredit[year],
        salary,
        'rate'
      );
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
    if (salary < constants.lowWageThreshold[year] / multiplier) {
      return 0;
    }
    return SalaryPaycheck.getRates(
      constants.labourCredit[year],
      salary,
      'rate',
      multiplier
    );
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
      percentage =
        (bracket.rate + bracket.older - bracket.social) / bracket.rate; // Removing only AOW from total
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

    brackets.some((bracket, _index) => {
      delta = bracket.max ? bracket.max - bracket.min : Infinity; // Consider infinity when no upper bound
      tax =
        Math.round(
          multiplier *
            (kind && bracket[kind] ? bracket[kind] : bracket['rate']) *
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
};

const NET_TO_GROSS_MAX_ITERATIONS = 30;
const NET_TO_GROSS_MATCH_EPSILON = 1e-6;
const NET_TO_GROSS_PLATEAU_SCAN_LIMIT = 1000; // cent steps each direction (±10.00)
const NET_TO_GROSS_COARSE_SCAN_STEPS = 4096; // fallback bracket search only

/**
 * Reverse calculation: given a target net amount, find the gross that produces it.
 *
 * @param {object} target Target net figure to solve for
 * @param {number} target.amount Target net amount
 * @param {'netYear'|'netMonth'} target.field Which net field the amount refers to
 * @param {boolean} target.holidayAllowanceIncluded Whether target.amount already includes the holiday allowance payout
 * @param {object} options Same shape SalaryPaycheck accepts
 * @param {'Year'|'Month'} options.period Must match target.field ('Year' for netYear, 'Month' for netMonth)
 * @param {number} options.year Year to perform calculation
 * @param {boolean} options.allowance Whether the solved gross should be treated as including holiday allowance
 * @param {boolean} options.socialSecurity Whether social security is considered
 * @param {boolean} options.older Whether is after retirement age or not
 * @param {number} options.hours Working hours per week
 * @param {object} options.ruling 30% ruling input, same shape SalaryPaycheck accepts
 * @returns {SalaryPaycheck|{grossLow: number, grossHigh: number}} The solved SalaryPaycheck result, or the plateau bounds when rounding makes the gross non-unique
 */
const netToGross = (target, options) => {
  const { amount, field, holidayAllowanceIncluded } = target || {};
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('netToGross: target.amount must be a finite number');
  }
  if (field !== 'netYear' && field !== 'netMonth') {
    throw new Error("netToGross: target.field must be 'netYear' or 'netMonth'");
  }

  const { period, year, allowance, socialSecurity, older, hours, ruling } =
    options || {};
  const expectedPeriod = field === 'netYear' ? 'Year' : 'Month';
  if (period !== expectedPeriod) {
    throw new Error(
      `netToGross: options.period must be '${expectedPeriod}' to match target.field '${field}'`
    );
  }
  const grossField = expectedPeriod === 'Year' ? 'grossYear' : 'grossMonth';

  const netOf = (result) => {
    const base = result[field];
    if (!holidayAllowanceIncluded) {
      return base;
    }
    return (
      base +
      (field === 'netYear' ? result.netAllowance : result.netAllowance / 12)
    );
  };

  const evaluate = (grossGuess) => {
    const result = new SalaryPaycheck(
      { income: grossGuess, allowance, socialSecurity, older, hours },
      period,
      year,
      ruling
    );
    return { grossGuess, result, net: netOf(result) };
  };

  const matches = (net) => Math.abs(net - amount) < NET_TO_GROSS_MATCH_EPSILON;

  // Find the exact cent-granularity plateau of gross (income) values that all
  // round to the same target net (SalaryPaycheck rounds every internal amount
  // to 2 decimals, so a range of inputs can share one rounded net output).
  //
  // anchorGross is a raw (unrounded) value already confirmed to match the
  // target net. Rounding it to cents does not always preserve that match
  // (intermediate bracket rounding is sensitive to the exact fractional
  // gross), so the rounded anchor is re-verified before it is trusted as the
  // start of the cent-by-cent scan.
  const findPlateau = (anchorGross) => {
    const anchorResult = evaluate(anchorGross).result;
    const anchorRounded = roundNumber(anchorGross, 2);
    // Rounding can land just outside the matching cent value in either
    // direction, so probe both neighbors before giving up on a clean
    // cent-aligned seed.
    const seed = [
      anchorRounded,
      roundNumber(anchorRounded - 0.01, 2),
      roundNumber(anchorRounded + 0.01, 2),
    ].find((candidate) => matches(evaluate(candidate).net));

    if (seed === undefined) {
      // No clean cent-aligned gross near the solution reproduces the target
      // net exactly; return the raw solution rather than rounding it away.
      return anchorResult;
    }

    let rawLow = seed;
    let rawHigh = seed;
    for (let i = 0; i < NET_TO_GROSS_PLATEAU_SCAN_LIMIT; i++) {
      const candidate = roundNumber(rawLow - 0.01, 2);
      if (!matches(evaluate(candidate).net)) break;
      rawLow = candidate;
    }
    for (let i = 0; i < NET_TO_GROSS_PLATEAU_SCAN_LIMIT; i++) {
      const candidate = roundNumber(rawHigh + 0.01, 2);
      if (!matches(evaluate(candidate).net)) break;
      rawHigh = candidate;
    }
    if (rawLow === rawHigh) {
      return evaluate(rawLow).result;
    }
    // The income fed into SalaryPaycheck is not always the reported gross
    // (e.g. the 8%-holiday-allowance inflation), so translate the plateau
    // edges through the actual reported field before reporting it.
    const edgeA = evaluate(rawLow).result[grossField];
    const edgeB = evaluate(rawHigh).result[grossField];
    const grossLow = Math.min(edgeA, edgeB);
    const grossHigh = Math.max(edgeA, edgeB);
    if (grossLow === grossHigh) {
      return evaluate(rawLow).result;
    }
    return { grossLow, grossHigh };
  };

  // Gross is not guaranteed to be >= net: when allowance=false and the 30%
  // ruling applies, SalaryPaycheck inflates the supplied income by 8% before
  // taxing it, so the true root can sit below the target net. 0 is the only
  // sound universal lower bound.
  let low = 0;
  let high = amount * 3;
  let highPoint = evaluate(high);

  let expansions = 0;
  while (highPoint.net < amount && expansions < NET_TO_GROSS_MAX_ITERATIONS) {
    high *= 2;
    highPoint = evaluate(high);
    expansions++;
  }
  if (highPoint.net < amount) {
    throw new Error(
      `netToGross: target net ${amount} is not achievable within the search bounds; the nearest achievable net at gross ${high} is ${highPoint.net}`
    );
  }

  // Single-bracket bisection assumes net is monotonic in gross. Try the fast
  // path first; it succeeds for the vast majority of inputs.
  const bisect = (bracketLow, bracketHigh) => {
    let bLow = bracketLow;
    let bHigh = bracketHigh;
    let bLowPoint = evaluate(bLow);
    let bHighPoint = evaluate(bHigh);
    for (let i = 0; i < NET_TO_GROSS_MAX_ITERATIONS; i++) {
      const midGross = (bLow + bHigh) / 2;
      const midPoint = evaluate(midGross);
      if (matches(midPoint.net)) {
        return { hit: findPlateau(midPoint.grossGuess) };
      }
      if (midPoint.net < amount) {
        bLow = midGross;
        bLowPoint = midPoint;
      } else {
        bHigh = midGross;
        bHighPoint = midPoint;
      }
    }
    const nearest =
      Math.abs(bLowPoint.net - amount) <= Math.abs(bHighPoint.net - amount)
        ? bLowPoint
        : bHighPoint;
    return { nearest };
  };

  const fastPath = bisect(low, high);
  if (fastPath.hit) {
    return fastPath.hit;
  }

  // The fast path didn't converge on an exact match. Net income is not
  // guaranteed to be monotonic in gross (see issue #85: net can decrease as
  // gross increases in narrow income bands), so a single bisection can
  // converge on the wrong side of a local dip and miss an otherwise
  // achievable target. Fall back to a coarse scan for every bracket where
  // net crosses the target, and bisect within each candidate bracket.
  const step = (high - low) / NET_TO_GROSS_COARSE_SCAN_STEPS;
  let prevGross = low;
  let prevPoint = evaluate(prevGross);
  let nearest = prevPoint;
  const updateNearest = (point) => {
    if (Math.abs(point.net - amount) < Math.abs(nearest.net - amount)) {
      nearest = point;
    }
  };

  for (let i = 1; i <= NET_TO_GROSS_COARSE_SCAN_STEPS; i++) {
    const gross = low + step * i;
    const point = evaluate(gross);
    updateNearest(point);

    const crosses = (prevPoint.net - amount) * (point.net - amount) < 0;
    if (matches(point.net)) {
      return findPlateau(point.grossGuess);
    }
    if (crosses) {
      const bracketResult = bisect(prevGross, gross);
      if (bracketResult.hit) {
        return bracketResult.hit;
      }
      updateNearest(bracketResult.nearest);
    }

    prevGross = gross;
    prevPoint = point;
  }

  // Last resort: some non-monotonic bands are only a single cent wide (a
  // brief spike or dip that the coarse scan can straddle without landing
  // inside it). A bounded cent-by-cent scan right around the closest miss
  // found so far catches those without paying for cent resolution across
  // the whole search range.
  const fineWindowLow = roundNumber(Math.max(low, nearest.grossGuess - 2), 2);
  const fineWindowHigh = roundNumber(Math.min(high, nearest.grossGuess + 2), 2);
  for (
    let gross = fineWindowLow;
    gross <= fineWindowHigh;
    gross = roundNumber(gross + 0.01, 2)
  ) {
    const point = evaluate(gross);
    updateNearest(point);
    if (matches(point.net)) {
      return findPlateau(point.grossGuess);
    }
  }

  throw new Error(
    `netToGross: no gross value converges to the exact target net of ${amount}; nearest achievable net is ${nearest.net} (${grossField}: ${nearest.result[grossField]})`
  );
};

export { SalaryPaycheck, constants, netToGross };
