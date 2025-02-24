const axios = require("axios");
const https = require("https");
const xlsx = require("xlsx");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

//set axios default headers
axios.defaults.headers.common["Content-Type"] = "application/json";

//export an object of functions
const utils = {
  getProjectIds: async (url) => {
    const data = {
      url: `${url}/v1/scans`,
      method: "get",
      params: {
        limit: 15000,
      }
    };

    const response = await axios(data, { httpsAgent: agent });
    return response.data.scans;
  },

  //make a new server request for a specific scan ID to fetch run number
  getScanDetails: async (url, scanId) => {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs`,
      method: "get",
      params: {
        limit: 15000,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    let result = {scanId, ...response.data.scanRuns[0]};
    return result;
  },

  getMultipleScanDetails: async (url, scanIds = []) => {
    let allScanDataRequests = scanIds.map((scanId) => utils.getScanDetails(url, scanId));
    let results =  Promise.allSettled(allScanDataRequests); 
    return results;
  },

  getPagesData: async (url, scanId, runId) => {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs/${runId}/pages`,
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    return response.data.pages;
  },
  
  getMultipleProjectsPageData: async (url, projectObjs = []) => {
    //projectObjs = [{scanId: Int, runId: Int}, ...]
    let allPageDataRequests = projectObjs.map((projectObj) => utils.getPagesData(url, projectObj.scanId, projectObj.runNumber));
    let results =  Promise.allSettled(allPageDataRequests);
    return results;
  },

  //generate excel with given JS object
  generateExcel: (data, fileName = "defaultName.xlsx") => {
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
  },
};

module.exports = utils;
