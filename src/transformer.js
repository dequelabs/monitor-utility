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
            ((result.report.report.good) /
              result.report.report.totalPages) *
            100,
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
          ARIA: groupingAndPriorityToIssueCountDict["Aria"],
          Color: groupingAndPriorityToIssueCountDict["Color"],
          Forms: groupingAndPriorityToIssueCountDict["Forms"],
          Keyboard: groupingAndPriorityToIssueCountDict["Keyboard"],
          Language: groupingAndPriorityToIssueCountDict["Language"],
          Media: groupingAndPriorityToIssueCountDict["Media"],
          "Name Role Value":
            groupingAndPriorityToIssueCountDict["Name Role Value"],
          Parsing: groupingAndPriorityToIssueCountDict["Parsing"],
          PDF: groupingAndPriorityToIssueCountDict["PDF"],
          Semantics: groupingAndPriorityToIssueCountDict["Semantics"],
          "Sensory and Visual Cues":
            groupingAndPriorityToIssueCountDict["Sensory And Visual Cues"],
          Structure: groupingAndPriorityToIssueCountDict["Structure"],
          Tables: groupingAndPriorityToIssueCountDict["Tables"],
          "Text Alternatives":
            groupingAndPriorityToIssueCountDict["Text Alternatives"],
          Time: groupingAndPriorityToIssueCountDict["Time"],
        };
        transformedResults.push(transformedResult);
      });

      resolve(transformedResults);
    });
  },
};
