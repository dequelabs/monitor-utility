const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("./progressbar");

const utilClassInstance = require("./utils");

const { getScanDetails, generateExcel, delay, generateJSON } = utilClassInstance;

const limit = plimit(2);

module.exports = async ({ url, scanGroups }) => {
  const results = [];

  try {
    //allScans:[{id:Int, name: String, group:[String]}] = [{id: 1, name: 'https://www.example.com', group:[]},...];
    let allScans = utilClassInstance.allAvailableProjects;

    if (scanGroups && scanGroups.trim().toLowerCase() !== "all") {
      const filterGroups = scanGroups.split(";").map((g) => g.trim().toLowerCase());
      allScans = allScans.filter(
        (scan) =>
          scan.groups &&
          scan.groups.some((g) => filterGroups.includes(g.name.toLowerCase()))
      );
    }

    if (allScans.length === 0) {
      console.log("No projects found. Exiting... 👋");
      return;
    }

    const bar = new cliProgress(allScans.length, {
      width: 40,
      showCount: true,
      message: "Downloading Scans:",
    });

    // Set the progress bar reference in utils for proper logging
    utilClassInstance.setProgressBar(bar);

    //collect errors from all promises
    const errors = [];

    const scanPromises = allScans.map((scan) =>
      limit(async () => {
        const { id: scanId, name, groups } = scan;
        const groupsNameString = groups
          .reduce((a, c) => a + c.name + ", ", "")
          .slice(0, -2);
        let retries = 3;
        while (retries > 0) {
          try {
            let {
              projectId,
              completedAt,
              axeVersion,
              standard,
              ...scanDetails
            } = await getScanDetails(scanId);
            results.push({
              "Project ID": scanId,
              "Project Name": name,
              "Project URL": `${url}/monitor/scans/${scanId}`,
              Groups: groupsNameString,
              ...scanDetails,
              "Axe Version": axeVersion,
              Standard: standard,
              "Completed At": completedAt,
            });
            break;
          } catch (error) {
            if (
              error.response &&
              error.response.status === 429 &&
              retries > 0
            ) {
              const message = `Rate limit hit for scan ID ${scanId}. Retrying...`;
              if (bar && typeof bar.log === 'function') {
                bar.log(message, 'warn');
              } else {
                console.warn(message);
              }
              await delay(1000 * (4 - retries));
              retries--;
            } else {
              errors.push({
                scanId,
                name,
                error: error.message || error,
              });
              break;
            }
          } finally {
            bar.increment();
          }
        }

        await delay(200); // Small delay to avoid overwhelming the server
      })
    );

    await Promise.allSettled(scanPromises);

    // Finish the progress bar
    bar.finish();

    if (errors.length > 0) {
      console.log(`
      -------------------------------------------------

      NOTE:
      `);
      errors.forEach((error, index) => {
        console.log(`
          ${index + 1}: Scan ID ${error.scanId} - ${error.error}
        `);
      });
      console.log(`
      -------------------------------------------------

      `);
    }

    results.sort((a, b) => a["Project ID"] - b["Project ID"]);

    await generateJSON(
      results,
      `scans-${Date.now()}.json`
    );

    // Generate Excel file
    await generateExcel(results, `scans-${Date.now()}.xlsx`);

    console.log(`Excel file generated successfully! 🎉
      
    `);
  } catch (error) {
    console.error(`Error: 🔥
      Could not get some projects for you on , 
      ${url} : ${error}
    `);
  }
};
