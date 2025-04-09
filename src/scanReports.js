const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("./progressbar");

const utilClassInstance = require("./utils");

const { getScanDetails, generateExcel, delay } =
  utilClassInstance;

const limit = plimit(3);

module.exports = async (answers) => {

  const results = [];

  try {
    //allScans:[{id:Int, name: String, group:[String]}] = [{id: 1, name: 'https://www.example.com', group:[]},...];
    let allScans = utilClassInstance.allAvailableProjects;

    if (allScans.length === 0) {
      console.log("No projects found. Exiting... 👋");
      return;
    }

    const bar = new cliProgress(allScans.length, {
      width: 40,
      showCount: true,
      message: "Downloading Scans:",
    });

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
            let { projectId, completedAt, ...scanDetails } = await getScanDetails(scanId);
            results.push({
              "Project ID": scanId,
              "Project Name": name,
              Groups: groupsNameString,
              ...scanDetails,
              "Completed At": completedAt
            });
            break;
          } catch (error) {
            if (
              error.response &&
              error.response.status === 429 &&
              retries > 0
            ) {
              console.warn(`Rate limit hit for scan ID ${scanId}. Retrying...`);
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
      })
    );

    await Promise.allSettled(scanPromises);

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
