const plimit = require("p-limit");

const cliProgress = require("./progressbar");
const utilClassInstance = require("./utils");

const limit = plimit(4);

module.exports = async (answers) => {
  let { projectid, scanGroups } = answers;

  const { allAvailableProjects, getPagesData, generateExcel, generateJSON } =
    utilClassInstance;

  // Apply scan group filter
  let filteredProjects = allAvailableProjects;
  if (scanGroups && scanGroups.trim().toLowerCase() !== "all") {
    const filterGroups = scanGroups.split(";").map((g) => g.trim().toLowerCase());
    filteredProjects = allAvailableProjects.filter(
      (scan) =>
        scan.groups &&
        scan.groups.some((g) => filterGroups.includes(g.name.toLowerCase()))
    );
  }

  // Resolve project IDs: "All" uses every project in the filtered set
  let projectids;
  const validationMessages = [];

  if (!projectid || projectid.trim().toLowerCase() === "all") {
    projectids = filteredProjects.map((p) => p.id);
  } else {
    projectids = projectid.split(",").map((id) => parseInt(id));

    projectids.forEach((id) => {
      if (isNaN(id)) {
        validationMessages.push(`Invalid project ID: ${id} 👾`);
      } else if (
        allAvailableProjects.findIndex((project) => project.id === id) === -1
      ) {
        validationMessages.push(
          `Project with ID ${id} is not available or inaccessible. Ignoring it. 🫠`
        );
      }
    });

    projectids = projectids.filter(
      (id) =>
        !isNaN(id) &&
        allAvailableProjects.findIndex((project) => project.id === id) !== -1
    );
  }

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
    // Fetch page details for selected projects
    let scanDetailsOfSelectedProjects =
      await utilClassInstance.getMultipleScanDetails(projectids);

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

    const progressBar = new cliProgress(totalPages, {
      message: "Downloading Pages:",
      width: 40,
      showCount: true,
    });

    // Set the progress bar reference in utils for proper logging
    utilClassInstance.setProgressBar(progressBar);

    // Log any validation messages now that we have a progress bar
    validationMessages.forEach(message => {
      progressBar.log(message, 'warn');
    });

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
                await getPagesData(scanId, runNumber, page);
              hasNext = hasNextPage;

              if (hasNext) {
                page++;
              }

              projectPages = projectPages.concat(pagesData);

              progressBar.increment(pagesData.length);
            }
          } catch (error) {
            errors.push({ scanId, error: error.message || error });
            const errorMessage = `Error fetching pages for scan ${scanId}: ${error.message || error}`;
            progressBar.log(errorMessage, 'error');
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
                "Scan Id": scanId,
                "Scan Name": projectNames[scanId],
                "Page Id": pageId,
                "Test URL": testUrl,
                "Page Title": testPageTitle,
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

    // Finish the progress bar
    progressBar.finish();

    await generateJSON(
      results,
      `pages-${Date.now()}.json`
    );

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
