const axios = require("axios");
const https = require("https");
const xlsx = require("xlsx");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

//export an object of functions
module.exports = {
  getProjectIds: async (url, token) => {
    const data = {
      url: `${url}/v1/scans`,
      method: "get",
      params: {
        limit: 15000,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    return response.data.scans;
  },

  //make a new server request for each scan ID to fetch run number
  getScanDetails: async (url, scanId, token) => {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs`,
      method: "get",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    let result = response.data.scanRuns[0] ;
    return result;
  },

  //generate excel with given JS object
  generateExcel: (data, fileName = "defaultName") => {
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
