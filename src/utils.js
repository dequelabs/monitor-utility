const axios = require("axios");
const https = require("https");
const xlsx = require("xlsx");
const plimit = require("p-limit");
const fs = require("fs");

const {
  ProjectIDsPerRequest,
  ProjectsMetaPerRequest,
  PagesPerRequest,
  IssuesPerRequest,
  ViolationCategory,
  RATE_LIMIT,
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
    this.requestCount = 0;
    this.requestStartTime = Date.now();
    this.progressBar = null;
  }

  setProgressBar(progressBar) {
    this.progressBar = progressBar;
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
        const response = await this.retryAxios(data);
        this.allAvailableProjects.push(...response.data.scans);

        hasNext = response.headers["x-pagination-has-next"] === "true";
        if (hasNext) {
          page++;
          data.headers["X-Pagination-Page"] = page;
        }
      }
    } catch (error) {
      const errorMessage = `
        Error fetching projects 🔥: 
        ${error.message || error}
      `;
      
      if (this.progressBar && typeof this.progressBar.log === 'function') {
        this.progressBar.log(errorMessage, 'error');
      } else {
        console.error(errorMessage);
      }
    }

    console.log(`
      Fetched all the projects you have access to.
    `);
    return Promise.resolve(this.allAvailableProjects);
  }

  //make a new server request for a specific scan ID to fetch latest run number
  async getScanDetails(scanId, needsReview = false) {
    const data = {
      url: `/v1/scans/${scanId}/runs`,
      method: "get",
      params: {
        needsReview,
      },
      headers: {
        "X-Pagination-Per-Page": ProjectsMetaPerRequest,
        "X-Pagination-Page": 1,
      },
    };

    const response = await this.retryAxios(data);
    let {
      runNumber,
      status,
      issues = {critical: 0, serious: 0, moderate: 0, minor: 0, total: 0},
      pages = {critical : 0, completed: 0},
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
    // Build violations object with page counts, merged with ViolationCategory, and sorted by key
    let violations = Object.fromEntries(
      Object.entries({
        ...ViolationCategory,
        ...Object.fromEntries(
          (violationGroups || []).map(({ name, pageCount }) => [
            `${name.toUpperCase()}`,
            pageCount,
          ])
        ),
      }).sort(([a], [b]) => a.localeCompare(b))
    );

    let result = {
      projectId: scanId,
      "Run-Number": runNumber,
      Score: Math.round(score * 10000) / 100,
      "Critical Issues": criticalIssues,
      "Serious Issues": seriousIssues,
      "Moderate Issues": moderateIssues,
      "Minor Issues": minorIssues,
      "All Issues": totalIssues,
      "Critical Pages": criticalPages,
      "Completed Pages": totalPages,
      ...moreInfo,
      ...violations,
    };
    return Promise.resolve({ ...result, completedAt });
  }

  async getMultipleScanDetails(scanIds = [], needsReview = false) {
    let allScanDataRequests = scanIds.map((scanId) =>
      limit(() => this.getScanDetails(scanId, needsReview))
    );

    let results = await Promise.allSettled(allScanDataRequests);
    const { fulfilled } = this.logSettledResults(
      results, 
      'Scan Details Fetch', 
      scanIds.map(id => `Scan ID: ${id}`)
    );

    return Promise.resolve(fulfilled);
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

    const response = await this.retryAxios(data);
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
    
    const { fulfilled, rejected } = this.logSettledResults(
      results,
      'Page Data Fetch',
      projectObjs.map(obj => `Scan ${obj.scanId}, Run ${obj.runNumber}`)
    );
  
    return results;
  }

  async getIssuesOfProject(scanId, runNumber, page) {
    try {
      const data = {
        method: "get",
        url: `/v1/scans/${scanId}/runs/${runNumber}/issues`,
        headers: {
          "X-Pagination-Per-Page": IssuesPerRequest,
          "X-Pagination-Page": page,
        },
      };
      const response = await this.retryAxios(data);

      return {
        issues: response.data.issues || [],
        hasNext: response.headers["x-pagination-has-next"] === "true",
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch issues for scan ${scanId}, run ${runNumber}, page ${page}: ${error.message}`
      );
    }
  }

  delay = (ms) => new Promise((res) => setTimeout(res, ms));

  throttledAxios = async (config) => {
    const now = Date.now();
    if (now - this.requestStartTime >= RATE_LIMIT.HOUR_IN_MS) {
      this.requestCount = 0;
      this.requestStartTime = now;
    }

    if (this.requestCount >= RATE_LIMIT.REQUESTS_PER_HOUR) {
      const waitTime = RATE_LIMIT.HOUR_IN_MS - (now - this.requestStartTime);
      const message = `⚠️ Hourly limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`;
      
      if (this.progressBar && typeof this.progressBar.log === 'function') {
        this.progressBar.log(message, 'warn');
      } else {
        console.warn(message);
      }
      
      await this.delay(waitTime);
      this.requestCount = 0;
      this.requestStartTime = Date.now();
    }

    await this.delay(RATE_LIMIT.THROTTLE_DELAY_MS);
    this.requestCount++;
    return axios({ ...config, httpsAgent: agent });
  };

  retryAxios = async (
    axiosConfig,
    retries = RATE_LIMIT.DEFAULT_RETRIES,
    baseDelay = RATE_LIMIT.BASE_RETRY_DELAY_MS
  ) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.throttledAxios(axiosConfig);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 429 || status === 503 || !status) {
          const wait = baseDelay * Math.pow(2, i);
          const message = `⚠️ ${status || "Network"} error. Retrying in ${wait} ms...`;
          
          if (this.progressBar && typeof this.progressBar.log === 'function') {
            this.progressBar.log(message, 'warn');
          } else {
            console.warn(message);
          }
          
          await this.delay(wait);
        } else {
          throw err;
        }
      }
    }
    throw new Error(
      `❌ Failed after ${retries} retries: ${axiosConfig.url}`
    );
  };

  generateJSON(data, fileName = "defaultName.json") {
    return new Promise((resolve, reject) => {
      try {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(fileName, jsonData);
        resolve();
      } catch (error) {
        console.error(`Error writing JSON to file ${fileName}: ${error}`);
        reject(error);
      }
    });
  }

  //generate excel with given JS object
  generateExcel(data, fileName = "defaultName.xlsx") {
    return new Promise((resolve, reject) => {
      try {
        // Truncate long text values to prevent Excel cell limit error
        const MAX_CELL_LENGTH = 32000; // Leave some buffer below 32767
      
        const processedData = data.map(row => {
          const processedRow = {};
          for (const [key, value] of Object.entries(row)) {
            let cellValue = value;

            // Convert to string and check length
            if (typeof cellValue === 'string' && cellValue.length > MAX_CELL_LENGTH) {
              cellValue = cellValue.substring(0, MAX_CELL_LENGTH) + '... [TRUNCATED]';
            } else if (cellValue && typeof cellValue === 'object') {
              // Handle objects by stringifying and truncating if needed
              cellValue = JSON.stringify(cellValue);
              if (cellValue.length > MAX_CELL_LENGTH) {
                cellValue = cellValue.substring(0, MAX_CELL_LENGTH) + '... [TRUNCATED]';
              }
            }

            processedRow[key] = cellValue;
          }
          return processedRow;
        });

        const ws = xlsx.utils.json_to_sheet(processedData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

        const header = Object.keys(processedData[0] || {});
        ws["!cols"] = header.map((headerText) => ({
          wch: Math.min(headerText.length + 2, 50), // Limit column width to 50
        }));

        xlsx.writeFile(wb, fileName);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

   // helper function to log unfullfilled promises
  logSettledResults(results, operation, identifiers = []) {
    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");

    if (rejected.length > 0) {
      const errorMessage = `\n❌ ${operation} - Failed: ${rejected.length}/${results.length}`;
      
      if (this.progressBar && typeof this.progressBar.log === 'function') {
        this.progressBar.log(errorMessage, 'error');
      } else {
        console.error(errorMessage);
      }
      
      rejected.forEach((result, index) => {
        const identifier = identifiers[results.indexOf(result)] || `Item ${index + 1}`;
        const detailMessage = `  • ${identifier}: ${result.reason}`;
        
        if (this.progressBar && typeof this.progressBar.log === 'function') {
          this.progressBar.log(detailMessage, 'error');
        } else {
          console.error(detailMessage);
        }
      });
      
      // Empty line for readability
      if (this.progressBar && typeof this.progressBar.log === 'function') {
        this.progressBar.log('', 'info');
      } else {
        console.error('');
      }
    }

    return {
      fulfilled: fulfilled.map(r => r.value),
      rejected,
      successCount: fulfilled.length,
      failureCount: rejected.length
    };
  }
}

module.exports = new Utils();
