const plimit = require("p-limit");
const https = require("https");
const cliProgress = require("cli-progress");

const utilClassInstance = require("./utils");

const limit = plimit(2);

module.exports = async (answers) => {
  let { url, projectid } = answers;

  //TODO: validate answers once at the beginning, such as url vaidation, projectid validation, etc.

  let projectids = projectid.split(",").map((id) => parseInt(id));

  projectids.forEach(id=>{
    if(isNaN(id)){
      console.log("Invalid project id: ", id);
    }

    if(utilClassInstance.allAvailableProjects.findIndex(project=>project.id === id) === -1){
      console.log(`Project with id ${id} is either not available or you do not have acccess to it. Please provide a valid project id.`);
    }
  });

  const results = [];

  try {
    
    let scanDetailsOfSelectedProjects = await utilClassInstance.getMultipleScanDetails(url, projectids);

    scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.filter((scan) => scan.status === 'fulfilled').map((scan) => scan.value);

    scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.map((scan) => {
      return { scanId: scan.scanId, runNumber: scan.runNumber };
    });

    // let multipleProjectsPages = await utilClassInstance.getMultipleProjectsPageData(url, scanDetailsOfSelectedProjects);

    //use getPagesData instead of getMultipleProjectsPageData

    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    bar1.start(scanDetailsOfSelectedProjects.length, 0);

    let multipleProjectsPages = scanDetailsOfSelectedProjects.map(async ({scanId, runNumber}) => {
      let pagesData = await utilClassInstance.getPagesData(url, scanId, runNumber);
      bar1.increment();
      let pagesDataWithProjectId = pagesData.map((page) => {
        return { projectId: scanId, ...page };
      });
      return pagesDataWithProjectId;
    });

    const settledPages = await Promise.allSettled(multipleProjectsPages);

    bar1.stop();

    const fulfilledPages = settledPages.filter((scan) => scan.status === 'fulfilled').map((scan) => scan.value);

    // Flatten the array of arrays into a single array of objects
    const flattenedProjectsPages = fulfilledPages.flat();

    console.log("flattenedProjectsPages`````", flattenedProjectsPages.length, flattenedProjectsPages[0]);

    await utilClassInstance.generateExcel(flattenedProjectsPages, "pages.xlsx");

    console.log("Excel file generated successfully!");
  } catch (error) {
    console.error("Error: Could not get some projects for you on ", url, error);
  }
};
