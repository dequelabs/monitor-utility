const plimit = require("p-limit");

const cliProgress = require("./progressbar");
const utilClassInstance = require("./utils");

const limit = plimit(4);

module.exports = async (answers) => {
  let { projectid } = answers;

  let projectids = projectid.split(",").map((id) => parseInt(id));

  const { allAvailableProjects, getIssuesOfProject, generateExcel, delay } =
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
      await utilClassInstance.getMultipleScanDetails(projectids);

    scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.map(
      (scan) => ({
        scanId: scan.projectId,
        runNumber: scan["Run-Number"],
        allIssues: scan["All Issues"],
      })
    );

    // Create a single progress bar instance for all projects
    const totalIssues = scanDetailsOfSelectedProjects.reduce(
      (sum, { allIssues }) => sum + allIssues,
      0
    );

    const progressBar = new cliProgress(totalIssues, {
      message: "Downloading Issues:",
      width: 40,
      showCount: true
    });

    // Fetch pages for each project
    const projectIssuesPromises = scanDetailsOfSelectedProjects.map(
      ({ scanId, runNumber }) =>
        limit(async () => {
          let projectIssues = [];
          let page = 1;
          let hasNext = true;

          try {
            while (hasNext) {
              const { issues: issuesData, hasNext: hasNextPage } =
                await getIssuesOfProject(scanId, runNumber, page);
              hasNext = hasNextPage;

              if (hasNext) {
                page++;
              }

              let needReviewFalseIssues = issuesData.filter(issue => issue.needsReview === false);

              projectIssues = projectIssues.concat(needReviewFalseIssues);

              progressBar.increment(needReviewFalseIssues.length);
            }
          } catch (error) {
            errors.push({ scanId, error: error.message || error });
          }

          results = results.concat(
            projectIssues.map(
              ({
                issueId,
                ruleId,
                description,
                help,
                helpUrl,
                impact,
                issueGrouping,
                needsReview,
                isExperimental,
                isManual,
                summary,
                selector,
                source,
                tags,
                igt,
                testName,
                createdAt,
                testUrl,
                testPageTitle,
              }) => ({
                "Project Id": scanId,
                "Project Name": projectNames[scanId],
                "Issue Id": issueId,
                "Rule Id": ruleId,
                Description: description,
                Help: help,
                "Help URL": helpUrl,
                Impact: impact,
                "Issue Group": issueGrouping,
                "Is Experimental": isExperimental,
                "Is Manual": isManual,
                Summary: summary,
                Selector: selector,
                "Source Code": source,
                Tags: tags.join(", "),
                IGT: igt,
                "Test Name": testName,
                "Test Url": testUrl,
                "Test Page Title": testPageTitle,
                "Created-At": createdAt
              })
            )
          );
          Promise.resolve(results);
        })
    );

    await Promise.allSettled(projectIssuesPromises);

    // Generate Excel file
    await generateExcel(results, `Issues-${Date.now()}.xlsx`);

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
