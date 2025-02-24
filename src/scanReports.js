const plimit = require("p-limit");
const https = require("https");
const cliProgress = require('cli-progress');

const { getProjectIds, getScanDetails, generateExcel, getMultipleScanDetails } = require("./utils");

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
    let allScans = await getProjectIds(url, password);

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    bar.start(allScans.length, 0);

    for (let i = 0; i < allScans.length; i++) {
      const { id: scanId, name, groups} = allScans[i];
      let scanDetails = await getScanDetails(url, scanId, password);
      // increment the bar value
      results.push({ scanId, name, groups: groups.join(", "), ...scanDetails });
      bar.update(i + 1);
    }

    bar.stop();

    await generateExcel(results, "scans.xlsx");
    console.log("Excel file generated successfully!");
  } catch (error) {
    console.error("Error: Could not get some projects for you on ", url, error);
  }
};
