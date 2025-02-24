const plimit = require("p-limit");
const https = require("https");
const cliProgress = require('cli-progress');

const utilClassInstance = require("./utils");

const { getScanDetails, generateExcel, getMultipleScanDetails } = utilClassInstance;

const limit = plimit(2);

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

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    bar.start(allScans.length, 0);

    const scanPromises = allScans.map(async (scan) => {
      const { id: scanId, name, groups } = scan;
      try {
      let scanDetails = await getScanDetails(url, scanId, password);
      results.push({ scanId, name, groups: groups.join(", "), ...scanDetails });
      } catch (error) {
      console.error(`Error fetching details for scan ID ${scanId}:`, error);
      } finally {
        bar.increment();
      }
    });

    await Promise.allSettled(scanPromises);

    bar.stop();

    await generateExcel(results, "scans.xlsx");
    console.log("Excel file generated successfully!");
  } catch (error) {
    console.error("Error: Could not get some projects for you on ", url, error);
  }
};
