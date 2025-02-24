const plimit = require("p-limit");
const https = require("https");
const cliProgress = require('cli-progress');

const utilClassInstance = require("./utils");

const {  } = require("./utils");

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
        
      try {
        
        let scanDetailsOfSelectedProjects = await utilClassInstance.getMultipleScanDetails(url, projectids);
    
        scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.filter((scan) => scan.status === 'fulfilled').map((scan) => scan.value);
    
        scanDetailsOfSelectedProjects = scanDetailsOfSelectedProjects.map((scan) => {
          return { scanId: scan.scanId, runNumber: scan.runNumber };
        });
        
        const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    
        bar2.start(scanDetailsOfSelectedProjects.length, 0);
    
        let multipleProjectsIssues = scanDetailsOfSelectedProjects.map(async ({scanId, runNumber}) => {
          let pagesData = await utilClassInstance.getIssuesOfProject(url, scanId, runNumber);
          bar2.increment();
          let issuesDataWithProjectId = pagesData.map((issues) => {
            return { projectId: scanId, ...issues };
          });
          return issuesDataWithProjectId;
        });
    
        const settledIssues = await Promise.allSettled(multipleProjectsIssues);
    
        bar2.stop();
    
        const fulfilledIssuesData = settledIssues.filter((response) => response.status === 'fulfilled').map((res) => res.value);
    
        // Flatten the array of arrays into a single array of objects
        const flattenedProjectsIssues = fulfilledIssuesData.flat();
    
        console.log("flattenedProjectsIssues`````", flattenedProjectsIssues.length, flattenedProjectsIssues[0]);
    
        //TODO: generate excel file with custom name
        await utilClassInstance.generateExcel(flattenedProjectsIssues, "Issues.xlsx");
    
        console.log("Excel file generated successfully!");
      } catch (error) {
        console.error("Error: Could not get some projects for you on ", url, error);
      }
}