const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("cli-progress");

const utilClassInstance = require("./utils");

const limit = plimit(4);

module.exports = async (answers) => {
  let { url, projectid } = answers;

  let projectids = projectid.split(",").map((id) => parseInt(id));

  const { allAvailableProjects, getPagesData, generateExcel, delay } =
    utilClassInstance;

  // Validate project IDs
  projectids.forEach((id) => {
    if (isNaN(id)) {
      console.log(`Invalid project ID: ${id} 👾`);
    } else if (
      allAvailableProjects.findIndex((project) => project.id === id) === -1
    ) {
      console.log(
        `Project with ID ${id} is not available or inaccessible. Ignoring it. 🫠`
      );
    }
  });

  projectids = projectids.filter(
    (id) =>
      !isNaN(id) &&
      allAvailableProjects.findIndex((project) => project.id === id) !== -1
  );

  if (projectids.length === 0) {
    console.log("No valid project IDs provided. Exiting... 👋");
    return;
  }

  let projectNames = projectids.reduce((acc, id) => {
    const project = allAvailableProjects.find((project) => project.id === id);
    if (project) {
      acc[id] = project.name;
    }
    return acc;
  }, {});

  let results = [];
  let errors = [];

  try {
    // Fetch scan details for selected projects
    let scanDetailsOfSelectedProjects =
      await utilClassInstance.getMultipleScanDetails(url, projectids);

    scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.map(
      (scan) => ({
        scanId: scan.projectId,
        runNumber: scan["Run-Number"],
        totalPages: scan["Completed Pages"],
      })
    );

    // Create a single progress bar instance for all projects
    const totalPages = scanDetailsOfSelectedProjects.reduce(
      (sum, { totalPages }) => sum + totalPages,
      0
    );
    const progressBar = new cliProgress.SingleBar(
      {
        format: `Fetching pages | {bar} | {percentage}% || {value}/{total} Pages`,
        hideCursor: true,
        forceRedraw: true,
      },
      cliProgress.Presets.rect
    );

    progressBar.start(totalPages, 0);

    // Fetch pages for each project
    const projectPromises = scanDetailsOfSelectedProjects.map(
      ({ scanId, runNumber, totalPages }) =>
        limit(async () => {
          let projectPages = [];
          let page = 1;
          let hasNext = true;

          try {
            while (hasNext) {
              const { pages: pagesData, hasNext: hasNextPage } =
                await getPagesData(url, scanId, runNumber, page);
              hasNext = hasNextPage;

              if (hasNext) {
                page++;
              }

              projectPages = projectPages.concat(pagesData);

              progressBar.increment(pagesData.length);
            }
          } catch (error) {
            errors.push({ scanId, error: error.message || error });
          }

          results = results.concat(
            projectPages.map(
              ({
                pageId,
                testUrl,
                testPageTitle,
                reasonForFailure,
                totalCriticalIssues,
                totalSeriousIssues,
                totalModerateIssues,
                totalMinorIssues,
                totalNeedsReview,
                totalFixedIssues,
                totalOpenIssues,
                health,
                scriptName,
                scriptStep,
                template,
                createdAt,
                domainUrl,
                status,
                ...pageMeta
              }) => ({
                "Project Id": scanId,
                "Project Name": projectNames[scanId],
                "Page Id": pageId,
                "Test URL": testUrl,
                "Page Title": testPageTitle,
                "Reason for Failure": reasonForFailure,
                "Critical Issues": totalCriticalIssues,
                "Serious Issues": totalSeriousIssues,
                "Moderate Issues": totalModerateIssues,
                "Minor Issues": totalMinorIssues,
                "Needs Review": totalNeedsReview,
                "Fixed Issues": totalFixedIssues,
                "Open Issues": totalOpenIssues,
                Health: health,
                "Script Name": scriptName,
                "Script Step": scriptStep,
                Template: template,
                "Created At": createdAt,
                "Domain URL": domainUrl,
                ...pageMeta,
              })
            )
          );
          Promise.resolve(results);
        })
    );

    await Promise.allSettled(projectPromises);

    progressBar.stop();

    // Generate Excel file
    await generateExcel(results, `pages-${Date.now()}.xlsx`);

    console.log(`
      Excel file generated successfully! 🎉
    `);
  } catch (error) {
    console.error("Error: Could not fetch pages for some projects.", error);
  }

  // Log errors if any
  if (errors.length > 0) {
    console.log(`Some requests failed:\n`);
    errors.forEach((err, index) => {
      console.log(`🔥 ${index + 1}. Project ID ${err.scanId}: ${err.error}\n`);
    });
  }
};
