const plimit = require("p-limit");
const axios = require("axios");
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
      "Your Axe Monitor username and password are needed to run this application.",
    );
    console.log("");
    return false;
  }

  urls = [url];

  console.log("");
  console.log("Be patient, this may take a bit...");

  console.log("Fetching results...");

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
              `No favorited projects were found at Axe Monitor URL - ${url}`,
            );
          }
        } catch (err) {
          console.log(" ");
          console.error("Error getting projects");
          console.error(err);
          console.log(" ");

          errors.push(err);
        }
      }),
    );

  const buildAxeReportsPromises = async () => {
    const promiseMatrix = [];
    for (const url in projects) {
      let index = 0;
      promiseMatrix.push(
        projects[url].map(async (project) =>
          limit(
            () =>
              new Promise((resolve, reject) => {
                index += 1;
                console.log(
                  `Fetching (${index} / ${projects[url].length}) of ${url} (ID ${project.id})`,
                );
                const result = {};
                axios
                  .get(`${url}/worldspace/projects/details/${project.id}`, {
                    auth: { username, password },
                    httpsAgent: agent,
                  })
                  .then((data) => {
                    let lastScanDate = "";
                    result.org = data.data.project.organizationName;
                    try {
                      lastScanDate = format(
                        parseISO(data.data.project.last_scan_date),
                        "MM/uu",
                      );
                      result.lastScanDate = data.data.project.last_scan_date;
                    } catch (error) {
                      // Date beyond any reasonable constraint if the original date does not display as a date
                      lastScanDate = "01/1990";
                      result.lastScanDate = "Not Reported";
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
                          },
                        )
                        .then((res) => {
                          result.server = url;
                          result.report = res.data;

                          resolve(result);
                        })
                        .catch((err) => {
                          console.log("");

                          console.error(
                            `Failed to get the summary for ${project.id}`,
                          );
                          console.log("");
                          errors.concat(
                            `Error getting project summaryReport for ${project.id}.`,
                          );
                        });
                    }, 100);
                  })
                  .catch((err) => {
                    console.log("");

                    console.error(`Error for ${project.id}`);
                    console.error(err);
                    console.log("");
                    errors.concat(
                      `Error getting project details for ${project.id}.`,
                    );
                  });
              }),
          ),
        ),
      );
    }
    return promiseMatrix;
  };
  const iteratePromises = async () => {
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
      }),
    );
  };
  const outputResults = async () => {
    if (results.length) {
      console.log(`Processing ${results.length} projects...`);

      const transformedReportResults = await transformer.report(results);

      console.log("Writing local files...");

      const workbook = xlsx.utils.book_new();
      const worksheetAllMonthly = xlsx.utils.json_to_sheet(
        transformedReportResults,
      );

      xlsx.utils.book_append_sheet(
        workbook,
        worksheetAllMonthly,
        "Organization Summary",
      );
      try {
        xlsx.writeFile(workbook, `report-${Date.now()}.xlsx`);
        console.log(`Wrote output as report-${Date.now()}`);
      } catch (err) {
        console.error("Error writing output. Please run script again.");
        console.error(err);
      }

      end = new Date();

      console.log(`Done! Completed in ${calculateCompletionTime()}\n\n`);

      return;
    } else {
      console.log(
        `Reporting stopped prematurely due to errors (below). Please correct the errors and run the report again.`,
      );

      console.log(`
List of errors:
${errors.join("\n")}
    `);
      return;
    }
  };

  await getProjectIdsFromUrls();
  const axiosPromiseArray = await buildAxeReportsPromises();
  await iteratePromises();
  await outputResults();
};
