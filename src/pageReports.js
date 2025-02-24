const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("cli-progress");

const { generateExcel, getMultipleScanDetails, getMultipleProjectsPageData } = require("./utils");

const limit = plimit(2);

module.exports = async (answers) => {
  let { password, url, projectid } = answers;

  //TODO: validate answers once at the beginning, such as url vaidation, projectid validation, etc.

  let projectids = projectid.split(",").map((id) => parseInt(id));

  const results = [];

  try {
    
    let scanDetailsOfSelectedProjects = await getMultipleScanDetails(url, projectids);

    scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.filter((scan) => scan.status === 'fulfilled').map((scan) => scan.value);

    console.log("scanDetailsOfSelectedProjects", scanDetailsOfSelectedProjects);

    let multipleProjectsPages = await getMultipleProjectsPageData(url, scanDetailsOfSelectedProjects);

    multipleProjectsPages = multipleProjectsPages.filter((scan) => scan.status === 'fulfilled').map((scan) => scan.value);

    // Flatten the array of arrays into a single array of objects
    const flattenedProjectsPages = multipleProjectsPages.flat();

    console.log("flattenedProjectsPages", flattenedProjectsPages);

    await generateExcel(flattenedProjectsPages, "pages.xlsx");

    console.log("Excel file generated successfully!");
  } catch (error) {
    console.error("Error: Could not get some projects for you on ", url, error);
  }
};
