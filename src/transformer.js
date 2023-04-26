const sha1 = require("sha1");

module.exports = {
  report: async (results) => {
    return new Promise((resolve) => {
      const transformedResults = [];

      results.forEach((result) => {
        const xor = "&*^%RJCTJF B#W($AU)O(SD D";
        const pid = result.report.report.id;
        const shareHash = sha1(`${pid}${xor}`);
        const shareUrl = `${result.server}/worldspace/organizationProject/summary/${pid}?share=${shareHash}`;

        const getTotalForGroupsAndPriorities = (dict) => {
          let issues = 0;
          result.report.report.issuelist.forEach((issue) => {
            if (issue.issuegrouping) {
              if (dict[issue.issuegrouping]) {
                dict[issue.issuegrouping] =
                  dict[issue.issuegrouping] + issue.issues;
              } else {
                dict[issue.issuegrouping] = issue.issues;
              }
            }
            if (issue.priority) {
              if (dict[issue.priority]) {
                dict[issue.priority] = dict[issue.priority] + issue.issues;
              } else {
                dict[issue.priority] = issue.issues;
              }
            }
          });
          return dict;
        };
        let groupingAndPriorityToIssueCountDict =
          getTotalForGroupsAndPriorities({});
        let transformedResult = {
          Site: result.report.report.name,
          "Shared Report URL": shareUrl,
          "Accessibility Score": result.report.report.score.toString(),
          "Total Pages Tested": result.report.report.totalPages,
          "% of pages with no errors found":
            (result.report.report.good / result.report.report.totalPages) * 100,
          "Good Pages": result.report.report.good.toString(),
          "Moderate Pages": result.report.report.fair.toString(),
          "Serious Pages": result.report.report.serious.toString(),
          "Critical Pages": result.report.report.critical.toString(),
          "Average # of errors per page":
            result.report.report.issuesPerPage.toString(),
          "Total Critical Issues":
            groupingAndPriorityToIssueCountDict["Critical"],
          "Total Serious Issues":
            groupingAndPriorityToIssueCountDict["Serious"],
          "Total Moderate Issues":
            groupingAndPriorityToIssueCountDict["Moderate"],
          "Total Minor Issues": groupingAndPriorityToIssueCountDict["Minor"],
          ARIA: getTotal("Aria"),
          Color: getTotal("Color"),
          Forms: getTotal("Forms"),
          Keyboard: getTotal("Keyboard"),
          Language: getTotal("Language"),
          Media: getTotal("Media"),
          "Name Role Value": getTotal("Name Role Value"),
          Parsing: getTotal("Parsing"),
          PDF: getTotal("Pdfwcag"),
          Semantics: getTotal("Semantics"),
          "Sensory and Visual Cues": getTotal("Sensory And Visual Cues"),
          Structure: getTotal("Structure"),
          Tables: getTotal("Tables"),
          "Text Alternatives": getTotal("Text Alternatives"),
          Time: getTotal("Time"),
        });
      });

      resolve(transformedResults);
    });
  },
};
