# Contribution Guidelines

We welcome and appreciate contributions from the community! Before getting started, please take a moment to read through our contribution guidelines.

## Ways to Contribute

1. **Bug Reports:** If you come across a bug or unexpected behavior, please open an issue detailing the problem, including a clear description and steps to reproduce.

2. **Feature Requests:** If you have an idea for a new feature or enhancement, open an issue to discuss it. We value your input and would love to hear your thoughts.

3. **Pull Requests:** We encourage you to contribute directly by submitting pull requests. Before starting, please ensure that there is an open issue discussing the changes you plan to make.

## Getting Started

1. Fork the repository to your GitHub account.
2. Clone the forked repository to your local machine.

   ```bash
   git clone https://github.com/your-username/repository.git

## Yearly Data Resource

Each year, the Dutch tax system undergoes adjustments, and the updated numbers can be found in the Nieuwsbrief Loonheffingen {YEAR}. For example, the information for the year 2024 is available in  [Nieuwsbrief Loonheffingen 2024](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/nieuwsbrief-loonheffingen-2024)

## Test Data Resource

As the yearly data changes, it's essential to keep the test data up to date. You can download the test data from the [Belastingdienst](
https://www.belastingdienst.nl/wps/wcm/connect/nl/personeel-en-loon/content/hulpmiddel-loonbelastingtabellen)(Tax Administration):

- Choose the relevant year.
- Select the country as the Netherlands.
- Opt for the "Standard situation."
- Choose the "White" chart.
- Set the period to "Month."
- Select the "Excel" format.

Download the file and adjust it to the CSV format, using `__test__/test-tax-20xx.csv` as a reference/example. Ensure that the test data aligns with the most recent changes in the tax system.
