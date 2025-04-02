const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("cli-progress");

const utilClassInstance = require("./utils");

const { getScanDetails, generateExcel, getMultipleScanDetails, delay } =
  utilClassInstance;

const limit = plimit(3);

module.exports = async (answers) => {
  let { password, url } = answers;
  // Remove trailing slash from URL that causes issues
  if (url.charAt(url.length - 1) == "/") {
    url = url.substring(0, url.length - 1);
  }
  if (!answers || !password) {
    console.log(
      "Your Axe Monitor username and password are needed to run this application."
    );
    console.log("");
    return false;
  }

  const results = [];

  try {
    //allScans:[{id:Int, name: String, group:[String]}] = [{id: 1, name: 'https://www.example.com', group:[]},...];
    let allScans = utilClassInstance.allAvailableProjects;

    if (allScans.length === 0) {
      console.log("No projects found. Exiting... 👋");
      return;
    }

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

    bar.start(allScans.length, 0);

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
            let { projectId, completedAt, ...scanDetails } = await getScanDetails(
              url,
              scanId,
              password
            );
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

    bar.stop();

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
