const plimit = require("p-limit");
const axios = require("axios");
const Spinner = require("cli-spinner").Spinner;
const parseISO = require("date-fns/parseISO");
const format = require("date-fns/format");
const xlsx = require("xlsx");

const getProjectIds = require("./getProjectIds");
const transformer = require("./transformer");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const limit = plimit(2);
let spinner = null;

const projects = {};
const results = [];
const errors = [];

const start = new Date();
let end;

const calculateCompletionTime = () => {
  const final = end.getTime() - start.getTime();

  let msec = final;
  const hh = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  const mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;
  const ss = Math.floor(msec / 1000);
  msec -= ss * 1000;

  return `${hh} hours ${mm} minutes ${ss} seconds`;
};

let urls;

module.exports = async (answers) => {
  let { username, password, date, type, url } = answers;
  // Remove trailing slash from URL that causes issues
  if (url.charAt(url.length - 1) == "/") {
    url = url.substring(0, url.length - 1);
  }
  let month, year;
  if (date) {
    month = date.split("/")[0];
    year = date.split("/")[1];
  }

  if (!answers || !username || !password) {
    console.log(
      "Your Axe Monitor username and password are needed to run this application."
    );
    console.log("");
    return false;
  }

  urls = [url];

  console.log("");
  console.log("Be patient, this may take a bit...");

  spinner = new Spinner("Fetching results...");
  spinner.start();

  const getProjectIdsFromUrls = async () =>
    await Promise.all(
      urls.map(async (url) => {
        if (!projects[url]) {
          projects[url] = [];
        }
        try {
          projects[url] = await getProjectIds(url, username, password);
          if (projects[url].length === 0) {
            errors.push(
              `No favorited projects were found at Axe Monitor URL - ${url}`
            );
          }
        } catch (err) {
          console.log("Error getting projects");
          errors.push(err);
        }
      })
    );

  const buildAxeReportsPromises = () => {
    const promiseMatrix = [];
    for (const url in projects) {
      promiseMatrix.push(
        projects[url].map(async (project) =>
          limit(
            () =>
              new Promise((resolve, reject) => {
                spinner.stop();
                spinner = new Spinner(`Fetching ${url} ID: ${project.id}`);
                spinner.start();
                const result = {};
                axios
                  .get(`${url}/worldspace/projects/details/${project.id}`, {
                    auth: { username, password },
                    httpsAgent: agent,
                  })
                  .then((data) => {
                    let lastScanDate = "";
                    try {
                      lastScanDate = format(
                        parseISO(data.data.project.last_scan_date),
                        "MM/uu"
                      );
                    } catch (error) {
                      // Date beyond any reasonable constraint if the original date does not display as a date
                      lastScanDate = "01/1990";
                    }
                    if (date && lastScanDate !== `${month}/${year}`) {
                      console.log(`Issue with dates for ${project.id}`);
                      resolve(false);
                    }

                    result.customAttributes =
                      data.data.project.customAttributes;
                    setTimeout(async () => {
                      await axios
                        .get(
                          `${url}/worldspace/project/summaryReport/${project.id}`,
                          {
                            auth: { username, password },
                            httpsAgent: agent,
                          }
                        )
                        .then((res) => {
                          result.server = url;
                          result.report = res.data;
                          resolve(result);
                        })
                        .catch((err) => {
                          console.log("");

                          console.log(
                            `Failed to get the summary for ${project.id}`
                          );
                          reject(
                            errors.concat(
                              `Error getting project summaryReport for ${project.id}.`
                            )
                          );
                        });
                    }, 100);
                  })
                  .catch((err) => {
                    console.log("");

                    console.log(err);
                    console.log("");
                    console.log(`Error for ${project.id}`);
                    reject(
                      errors.concat(
                        `Error getting project details for ${project.id}.`
                      )
                    );
                  });
              })
          )
        )
      );
    }
    return promiseMatrix;
  };

  await getProjectIdsFromUrls();
  const axiosPromiseArray = buildAxeReportsPromises();
  await Promise.allSettled(
    axiosPromiseArray.map(async (axiosPromise) => {
      const responses = await Promise.allSettled(axiosPromise);
      responses.forEach(async (result) => {
        if (result.status === "rejected") {
          console.log("");
          console.log("err result status rejected");

          errors.push(result);
          return;
        }
        if (result.value) {
          results.push(result.value);
        }
      });
    })
  );

  if (results.length) {
    spinner.stop();
    spinner = new Spinner(`Processing ${results.length} projects...`);
    spinner.start();

    const transformedReportResults = await transformer.report(results);

    spinner.stop();
    spinner = new Spinner("Writing local files...");
    spinner.start();

    const workbook = xlsx.utils.book_new();
    const worksheetAllMonthly = xlsx.utils.json_to_sheet(
      transformedReportResults
    );

    xlsx.utils.book_append_sheet(
      workbook,
      worksheetAllMonthly,
      "Organization Summary"
    );
    xlsx.writeFile(workbook, "report.xlsx");

    end = new Date();

    spinner.stop();
    spinner = new Spinner(
      `Done! Completed in ${calculateCompletionTime()}\n\n`
    );
    spinner.start();
    spinner.stop();
    return;
  } else {
    spinner.stop();
    console.log(
      `Reporting stopped prematurely due to errors (below). Please correct the errors and run the report again.`
    );

    console.log(`
List of errors:
${errors.join("\n")}
    `);
    return;
  }
};
