# Monitor Reporter CLI

Automatically fetches data from monthly Monitor scans and generates an Excel file deliverable. Each row on the sheet is a Site representing a Project within an Organization. For each Project, a URL is given to the shared report, as well as a total count of pages, total issues found across the pages, and percentage of raw data (a calculated score). The issue counts are broken down into counts per grouping. The issue grouping categories are ARIA, Color, Forms, Keyboard, Language, Media, Name Role Value, Parsing, PDF, Semantics, Sensory and Visual Cues, Structure, Tables, Text Alternatives, and Time.

## Instructions

You will need access to the Monitor instance you want to use, including projects and scans within the organization.

To run the code, from the root run `npm run report`. Enter the Monitor URL, making sure it does not end with a slash. Login with your Deque email and password when prompted. You will have the option to limit the results to a specific month in the MM/YYYY format.

## Code Design

The script begins in `index.js`, which prompts the user for all input information and verifies URL and date format. After prompting, it calls `reporter.js`. It checks that a username and password were provided, and begins fetching results by first getting the project IDs in `getProjectIds.js` from the `/worldspace/organizationprojects` endpoint of the Monitor 6.7 API. Once the projects are identified, it continues in the reporter and uses the IDs to gather details (`/worldspace/projects/details/${project.id}`) and summary reports (`/worldspace/project/summaryReport/${project.id}`) for each project. After all requests are completed, it compiles the data in `transformer.js`. It then continues in the reporter to write the file and calculate completion time.

## Modifying the output

To modify what in output in the csv update the results that are pushed inside the `transformer.js` file.
