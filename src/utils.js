const axios = require("axios");
const https = require("https");
const xlsx = require("xlsx");
const plimit = require("p-limit");

const {
  ProjectIDsPerRequest,
  ProjectsMetaPerRequest,
  PagesPerRequest,
  IssuesPerRequest,
} = require("./constants");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const limit = plimit(4);

//export an object of functions
class Utils {
  constructor() {
    this.allAvailableProjects = [];
    this.getScanDetails = this.getScanDetails.bind(this);
    this.getMultipleScanDetails = this.getMultipleScanDetails.bind(this);
    this.getPagesData = this.getPagesData.bind(this);
    this.getIssuesOfProject = this.getIssuesOfProject.bind(this);
  }

  async getProjectIds() {
    let page = 1;
    let hasNext = true;

    const data = {
      url: `/v1/scans`,
      method: "get",
      headers: {
        "X-Pagination-Per-Page": ProjectIDsPerRequest,
        "X-Pagination-Page": page,
      },
    };

    try {
      while (hasNext) {
        const response = await axios(data, { httpsAgent: agent });
        this.allAvailableProjects = this.allAvailableProjects.concat(
          response.data.scans
        );

        hasNext = response.headers["x-pagination-has-next"] === "true";
        if (hasNext) {
          page++;
          data.headers["X-Pagination-Page"] = page;
        }
      }
    } catch (error) {
      console.error(`
        Error fetching projects 🔥: 
        ${error.message || error}
      `);
    }

    console.log(`
      Fetched all the projects you have access to.
    `);
    return Promise.resolve(this.allAvailableProjects);
  }

  //make a new server request for a specific scan ID to fetch latest run number
  async getScanDetails(scanId) {
    const data = {
      url: `/v1/scans/${scanId}/runs`,
      method: "get",
      params: {
        needsReview: false,
      },
      headers: {
        "X-Pagination-Per-Page": ProjectsMetaPerRequest,
        "X-Pagination-Page": 1,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    let {
      runNumber,
      status,
      issues,
      pages,
      violationGroups,
      score,
      queuedAt,
      startedAt,
      completedAt,
      ...moreInfo
    } = response.data.scanRuns[0];

    if (status !== "Completed") {
      return Promise.reject(
        `Scan with id ${scanId} is not completed yet. It's status is ${status} and hence ignored for now.`
      );
    }

    let {
      critical: criticalIssues = 0,
      serious: seriousIssues = 0,
      moderate: moderateIssues = 0,
      minor: minorIssues = 0,
      total: totalIssues = 0,
    } = issues;
    let { critical: criticalPages = 0, completed: totalPages = 0 } =
      pages || {};
    let violations = violationGroups.reduce((accumulator, group) => {
      let { name, pageCount } = group;
      accumulator[`${name.toUpperCase()} (Pages)`] = pageCount;
      return accumulator;
    }, {});

    let result = {
      projectId: scanId,
      "Run-Number": runNumber,
      Score: `${score * 100}%`,
      "Critical Issues": criticalIssues,
      "Serious Issues": seriousIssues,
      "Moderate Issues": moderateIssues,
      "Minor Issues": minorIssues,
      "All Issues": totalIssues,
      "Critical Pages": criticalPages,
      "Completed Pages": totalPages,
      ...moreInfo,
      ...violations,
      completedAt,
    };
    return Promise.resolve(result);
  }

  async getMultipleScanDetails(scanIds = []) {
    let allScanDataRequests = scanIds.map((scanId) =>
      limit(() => this.getScanDetails(scanId))
    );

    let results = await Promise.allSettled(allScanDataRequests);
    results = results
      .filter((scan) => scan.status === "fulfilled")
      .map((scan) => scan.value);

    return Promise.resolve(results);
  }

  async getPagesData(scanId, runId, page = 1) {
    const data = {
      url: `/v1/scans/${scanId}/runs/${runId}/pages`,
      method: "get",
      params: {
        status: "Completed",
      },
      headers: {
        "X-Pagination-Per-Page": PagesPerRequest,
        "X-Pagination-Page": page,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    return {
      pages: response.data.pages,
      hasNext: response.headers["x-pagination-has-next"] === "true",
    };
  }

  async getMultipleProjectsPageData(projectObjs = []) {
    //projectObjs = [{scanId: Int, runId: Int}, ...]
    let allPageDataRequests = projectObjs.map((projectObj) =>
      this.getPagesData(projectObj.scanId, projectObj.runNumber)
    );
    let results = await Promise.allSettled(allPageDataRequests);
    return results;
  }

  async getIssuesOfProject(scanId, runId, page = 1) {
    const data = {
      url: `/v1/scans/${scanId}/runs/${runId}/issues`,
      method: "get",
      params: {
        status: "open",
      },
      headers: {
        "X-Pagination-Per-Page": IssuesPerRequest,
        "X-Pagination-Page": page,
      },
    };

    const response = await axios(data, { httpsAgent: agent });
    return {issues:response.data.issues, hasNext: response.headers["x-pagination-has-next"] === "true"};
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  //generate excel with given JS object
  generateExcel(data, fileName = "defaultName.xlsx") {
    return new Promise((resolve, reject) => {
      try {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        const header = Object.keys(data[0] || {});
        ws["!cols"] = header.map((headerText) => ({
          wch: headerText.length + 2,
        }));

        xlsx.writeFile(wb, fileName);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new Utils();
