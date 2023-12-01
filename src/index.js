const inquirer = require("inquirer");
const clear = require("clear");
const version = require("../package.json").version;
const reporter = require("./reporter");
const exportIssues = require("./exportIssues");
const { el } = require("date-fns/locale");

clear();

const date = new Date();
const _month = date.getMonth() + 1;
const month = _month < 10 ? `0${_month}` : _month;
const year = date.getFullYear();

console.log("\nMonitor Utility \nVersion: " + version);

inquirer
  .prompt([
    {
      type: "input",
      name: "url",
      message:
        "Enter your Axe Monitor URL (example: https://example-axemonitor.dequecloud.com):",
      validate: (input) => {
        return new Promise((resolve, reject) => {
          if (
            /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/.test(
              input,
            )
          ) {
            resolve(true);
          }
          reject("Incorrect URL format");
        });
      },
      // default: "https://axemonitor.dequecloud.com",
      // default: "https://qa-windows-validation.dequemonitordev.com"
      default : "https://qa-rocky-regression.dequemonitordev.com"
    },
    {
      type: "input",
      name: "username",
      message: "Enter your Axe Monitor email address:",
      default:"admin.monitor@deque.com"
    },
    {
      type: "password",
      name: "password",
      message: "Enter your Axe Monitor password:",
      default: "F@ncy7201toaster"
    },
    {
      type: "list",
      name: "path",
      message: "What are you trying to do today?",
      choices: [
        {
          name: "projects",
          value: "projects",
          description: "Export data about my favorited projects.",
        },
        {
          name: "issues",
          value: "issues",
          description: "Export all of the issues from a specific project.",
        },
      ],
    },
    {
      type: "list",
      name: "reportType",
      message: "Individual project report or Combine Report",
      choices: [
        {
          name: "combined-issues",
          value: "combined-issues",
          description: "Export all of the issues from different project.",
        },
        {
          name: "individual-issues",
          value: "individual-issues",
          description: "Export all of the issues from a specific project.",
        },
      ],
    },
  ])
  .then((answers) => {
    if (answers.path === "issues") {
      // Prompt for the project ID and then export all issues.
      inquirer
        .prompt([
          {
            type: "input",
            name: "projectid",
            message:
              "List all Project Id(s) you'd like to export, separated by a comma (i.e. 24,15,215). Project Id can be found in your Axe Monitor URL (Example URL https://axemonitor.dequecloud.com/worldspace/organizationProject/summary/544 with 544 being the Project ID).",
          },
        ])
        .then((answersPartTwo) => {
          answers.projectid = answersPartTwo.projectid;
          exportIssues(answers);
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      console.log(`
--------------------------------------------------
Only projects you have marked as a "favorite" will
be reported in this tool. You can un/mark projects
as a "favorite" to include or exclude them.
--------------------------------------------------
`);
      inquirer
        .prompt([
          {
            type: "confirm",
            name: "limit",
            message: "Limit to specific month?",
            default: true,
          },
          {
            type: "input",
            name: "date",
            message: "Enter MM/YYYY to limit report:",
            default: `${month}/${year}`,
            validate: (input) => {
              return new Promise((resolve, reject) => {
                if (/^(0?[1-9]|1[012])[\/\-]\d{4}$/.test(input)) {
                  resolve(true);
                }
                reject("Incorrect date format");
              });
            },
            when: (answersPartTwo) => answersPartTwo.limit,
          },
        ])
        .then((answersPartTwo) => {
          answers.date = answersPartTwo.date;
          answers.limit = answersPartTwo.limit;
          reporter(answers);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  })
  .catch((error) => {
    console.error(error);
  });
