const axios = require("axios");
const https = require("https");
const xlsx = require("xlsx");
const cliProgress = require("cli-progress");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

//export an object of functions
class Utils {

  constructor() {
    this.allAvailableProjects = [];
    this.getScanDetails = this.getScanDetails.bind(this);
    this.getMultipleScanDetails = this.getMultipleScanDetails.bind(this);
    this.getPagesData = this.getPagesData.bind(this);
    this.getIssuesOfProject = this.getIssuesOfProject.bind(this);
  }

  async getProjectIds (url) {
    const data = {
      url: `${url}/v1/scans`,
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    this.allAvailableProjects = response.data.scans;
    return response.data.scans;
  }

  //make a new server request for a specific scan ID to fetch latest run number
  async getScanDetails  (url, scanId) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs`,
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    let result = {scanId, ...response.data.scanRuns[0], scanName: this.allAvailableProjects.find(project => project.id === scanId).name};
    return result;
  }

  async getMultipleScanDetails (url, scanIds = []) {
    let allScanDataRequests = scanIds.map((scanId) => this.getScanDetails(url, scanId));
    let results =  Promise.allSettled(allScanDataRequests);
    return results;
  }

  async getPagesData (url, scanId, runId) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs/${runId}/pages`,
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    return response.data.pages;
  }
  
  async getMultipleProjectsPageData (url, projectObjs = []) {
    //projectObjs = [{scanId: Int, runId: Int}, ...]
    let allPageDataRequests = projectObjs.map((projectObj) => this.getPagesData(url, projectObj.scanId, projectObj.runNumber));
    let results =  Promise.allSettled(allPageDataRequests);
    return results;
  }

  async getIssuesOfProject (url, scanId, runId) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs/${runId}/issues`,
      params: {
        status: 'open'
      },
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    console.log("Issues of project", url, scanId, response.data.issues.length);
    return response.data.issues;
  }

  //generate excel with given JS object
  generateExcel (data, fileName = "defaultName.xlsx") {
    return new Promise((resolve, reject) => {
      try {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        xlsx.writeFile(wb, fileName);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
};

module.exports = new Utils();
