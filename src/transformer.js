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
        const populateGroupToIssuesCountDict = () => {
          // Todo make this more effiencent by completing it in one run.
          // It can be combined with severity counting.
          let groupingToIssueCountDict = {};
          groupingToIssueCountDict["ARIA"] = getTotal("Aria");
          groupingToIssueCountDict["Color"] = getTotal("Color");
          groupingToIssueCountDict["Forms"] = getTotal("Forms");
          groupingToIssueCountDict["Keyboard"] = getTotal("Keyboard");
          groupingToIssueCountDict["Language"] = getTotal("Language");
          groupingToIssueCountDict["Media"] = getTotal("Media");
          groupingToIssueCountDict["Name Role Value"] =
            getTotal("Name Role Value");
          groupingToIssueCountDict["Parsing"] = getTotal("Parsing");
          groupingToIssueCountDict["PDF"] = getTotal("PDF");
          groupingToIssueCountDict["Semantics"] = getTotal("Semantics");
          groupingToIssueCountDict["Sensory And Visual Cues"] = getTotal(
            "Sensory And Visual Cues"
          );
          groupingToIssueCountDict["Structure"] = getTotal("Structure");
          groupingToIssueCountDict["Tables"] = getTotal("Tables");
          groupingToIssueCountDict["Text Alternatives"] =
            getTotal("Text Alternatives");
          groupingToIssueCountDict["Time"] = getTotal("Time");
          return groupingToIssueCountDict;
        };
        const getTotal = (group = "", priority = "") => {
          let issues = 0;
          result.report.report.issuelist.forEach((issue) => {
            if (!group && !priority) {
              issues = issues + issue.issues;
            } else if (group && issue.issuegrouping === group) {
              issues = issues + issue.issues;
            } else if (priority && issue.priority === priority) {
              issues = issues + issue.issues;
            }
          });
          return issues;
        };
        let groupingToIssueCountDict = populateGroupToIssuesCountDict();
        let transformedResult = {
          Site: result.report.report.name,
          "Shared Report URL": shareUrl,
          "Accessibility Score": result.report.report.score.toString(),
          "Total Pages Tested": result.report.report.totalPages,
          "% of pages with no errors found":
            ((result.report.report.totalPages - result.report.report.good) /
              result.report.report.totalPages) *
            100,
          "Good Pages": result.report.report.good.toString(),
          "Moderate Pages": result.report.report.fair.toString(),
          "Serious Pages": result.report.report.serious.toString(),
          "Critical Pages": result.report.report.critical.toString(),
          "Average # of errors per page":
            result.report.report.issuesPerPage.toString(),
          "Total Critical Issues": getTotal("", "Critical"),
          "Total Serious Issues": getTotal("", "Serious"),
          "Total Moderate Issues": getTotal("", "Moderate"),
          "Total Minor Issues": getTotal("", "Minor"),
          ARIA: groupingToIssueCountDict["Aria"],
          Color: groupingToIssueCountDict["Color"],
          Forms: groupingToIssueCountDict["Forms"],
          Keyboard: groupingToIssueCountDict["Keyboard"],
          Language: groupingToIssueCountDict["Language"],
          Media: groupingToIssueCountDict["Media"],
          "Name Role Value": groupingToIssueCountDict["Name Role Value"],
          Parsing: groupingToIssueCountDict["Parsing"],
          PDF: groupingToIssueCountDict["PDF"],
          Semantics: groupingToIssueCountDict["Semantics"],
          "Sensory and Visual Cues":
            groupingToIssueCountDict["Sensory And Visual Cues"],
          Structure: groupingToIssueCountDict["Structure"],
          Tables: groupingToIssueCountDict["Tables"],
          "Text Alternatives": groupingToIssueCountDict["Text Alternatives"],
          Time: groupingToIssueCountDict["Time"],
        };
        transformedResults.push(transformedResult);
      });

      resolve(transformedResults);
    });
  },
};
