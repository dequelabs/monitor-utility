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

  async getProjectIds(url) {
    let page = 1;
    let hasNext = true;

    const data = {
      url: `${url}/v1/scans`,
      method: "get",
      headers: {
        "X-Pagination-Per-Page": ProjectIDsPerRequest,
        "X-Pagination-Page": page,
      },
    };

    const ora = (await import("ora")).default;
    const spinner = ora(
      "Fetching all the projects info you have access to..."
    ).start();

    try {
      while (hasNext) {
        const response = await axios(data, { httpsAgent: agent });
        this.allAvailableProjects = this.allAvailableProjects.concat(
          response.data.scans
        );

        if (page % 2 === 0) {
          spinner.text = `Fetched ${page} pages...`;
        } else {
          spinner.text = `We are almost there...`;
        }

        hasNext = response.headers["x-pagination-has-next"] === "true";
        if (hasNext) {
          page++;
          data.headers["X-Pagination-Page"] = page;
        }
      }
    } catch (error) {
      spinner.fail("Failed to fetch projects.");
      console.error(`
        Error fetching projects 🔥: 
        ${error.message || error}
      `);
    }

    spinner.succeed(`Fetched all the projects you have access to.\n`);
    return Promise.resolve(this.allAvailableProjects);
  }

  //make a new server request for a specific scan ID to fetch latest run number
  async getScanDetails(url, scanId) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs`,
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

  async getMultipleScanDetails(url, scanIds = []) {
    let allScanDataRequests = scanIds.map((scanId) =>
      limit(() => this.getScanDetails(url, scanId))
    );

    let results = await Promise.allSettled(allScanDataRequests);
    results = results
      .filter((scan) => scan.status === "fulfilled")
      .map((scan) => scan.value);

    return Promise.resolve(results);
  }

  async getPagesData(url, scanId, runId, page = 1) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs/${runId}/pages`,
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

  async getMultipleProjectsPageData(url, projectObjs = []) {
    //projectObjs = [{scanId: Int, runId: Int}, ...]
    let allPageDataRequests = projectObjs.map((projectObj) =>
      this.getPagesData(url, projectObj.scanId, projectObj.runNumber)
    );
    let results = await Promise.allSettled(allPageDataRequests);
    return results;
  }

  async getIssuesOfProject(url, scanId, runId) {
    const data = {
      url: `${url}/v1/scans/${scanId}/runs/${runId}/issues`,
      params: {
        status: "open",
      },
      method: "get",
    };

    const response = await axios(data, { httpsAgent: agent });
    console.log("Issues of project", url, scanId, response.data.issues.length);
    return response.data.issues;
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
