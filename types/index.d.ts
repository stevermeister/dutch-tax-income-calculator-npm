export class SalaryPaycheck {
    static getHolidayAllowance(amountYear: any): number;
    static getTaxFree(taxFreeYear: any, grossYear: any): number;
    static getNetYear(taxableYear: any, incomeTax: any, taxFreeYear: any): number;
    static getAmountMonth(amountYear: any): number;
    static getAmountWeek(amountYear: any): number;
    static getAmountDay(amountYear: any): number;
    static getAmountHour(amountYear: any, hours: any): number;
    /**
     * 30% Ruling (30%-regeling)
     * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_wonen/tijdelijk_in_een_ander_land_werken/u_komt_in_nederland_werken/30_procent_regeling/voorwaarden_30_procent_regeling/u-hebt-een-specifieke-deskundigheid
     *
     * @param {string} year Year to retrieve information from
     * @param {string} ruling Choice between scientific research workers, young professionals with Master's degree or others cases
     * @returns {number} The 30% Ruling minimum income
     */
    static getRulingIncome(year: string, ruling: string): number;
    /**
     * Payroll Tax Rates (Loonbelasting)
     * https://www.belastingdienst.nl/bibliotheek/handboeken/html/boeken/HL/stappenplan-stap_7_loonbelasting_premie_volksverzekeringen.html
     *
     * @param {string} year Year to retrieve information from
     * @param {number} salary Taxable wage that will be used for calculation
     * @returns {number} The Payroll Tax Rates after calculating proper bracket amount
     */
    static getPayrollTax(year: string, salary: number): number;
    /**
     * Social Security Contribution (Volksverzekeringen - AOW, Anw, Wlz)
     * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/volksverzekeringen
     *
     * @param {string} year Year to retrieve information from
     * @param {number} salary Taxable wage that will be used for calculation
     * @param {string} [older] Whether is after retirement age or not
     * @returns {number} The Social Security Contribution after calculating proper bracket amount
     */
    static getSocialTax(year: string, salary: number, older?: string): number;
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
    static getGeneralCredit(year: string, salary: number, older: boolean, multiplier?: number): number;
    /**
     * Labour Tax Credit (Arbeidskorting)
     * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/heffingskortingen/arbeidskorting/
     *
     * @param {string} year Year to retrieve information from
     * @param {number} salary Taxable wage that will be used for calculation
     * @param {number} [multiplier] Scalar value to multiple against final result
     * @returns {number} The Labour Tax Credit after calculating proper bracket amount
     */
    static getLabourCredit(year: string, salary: number, multiplier?: number): number;
    /**
     * Social Security Contribution (Volksverzekeringen) Component of Tax Credit
     * https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/werk_en_inkomen/sociale_verzekeringen/premies_volks_en_werknemersverzekeringen/volksverzekeringen/hoeveel_moet_u_betalen
     *
     * @param {string} year Year to retrieve information from
     * @param {boolean} older Whether is after retirement age or not
     * @param {boolean} socialSecurity Whether social security will be considered or not
     * @returns {number} Social Security contribution percentage to apply to wage credit
     */
    static getSocialCredit(year: string, older: boolean, socialSecurity: boolean): number;
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
    static getRates(brackets: object[], salary: number, kind: string, multiplier?: number): number;
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
    constructor(salaryInput: object, startFrom: 'Year' | 'Month' | 'Week' | 'Day' | 'Hour', year: number, ruling: object);
    grossYear: number;
    grossMonth: number;
    grossWeek: number;
    grossDay: number;
    grossHour: number;
    grossAllowance: number;
    taxFreeYear: number;
    taxableYear: number;
    taxFree: number;
    payrollTax: number;
    payrollTaxMonth: number;
    socialTax: number;
    socialTaxMonth: number;
    taxWithoutCredit: number;
    taxWithoutCreditMonth: number;
    labourCredit: number;
    labourCreditMonth: number;
    generalCredit: number;
    generalCreditMonth: number;
    taxCredit: number;
    taxCreditMonth: number;
    incomeTax: number;
    incomeTaxMonth: number;
    netYear: number;
    netAllowance: number;
    netMonth: number;
    netWeek: number;
    netDay: number;
    netHour: number;
}
export { constants };
