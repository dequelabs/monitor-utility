const sha1 = require("sha1");

module.exports = {
  report: async (results) => {
    return new Promise((resolve) => {
      const transformedResults = [];

      results.forEach((result) => {
        try {
          const xor = "&*^%RJCTJF B#W($AU)O(SD D";
          const pid = result.report.report.id;
          const shareHash = sha1(`${pid}${xor}`);
          const shareUrl = `${result.server}/worldspace/organizationProject/summary/${pid}?share=${shareHash}`;

          const getTotal = (group) => {
            let issues = 0;
            result.report.report.issuelist.forEach((issue) => {
              if (!group) {
                issues = issues + issue.issues;
              } else if (issue.issuegrouping === group) {
                issues = issues + issue.issues;
              }
            });
            return issues;
          };
          transformedResults.push({
            Site: result.report.report.name,
            "Shared Report URL": shareUrl,
            Organization: result.org,
            "Total Pages": result.report.report.totalPages,
            "Total Issues": getTotal(),
            "Pages having Minor or No Issues": result.report.report.good.toString(),
            "Pages having Moderate Issues": result.report.report.fair.toString(),
            "Pages having Serious Issues": result.report.report.serious.toString(),
            "Pages having Critical Issues": result.report.report.critical.toString(),
            "Accessibility Score (%)": parseFloat(
              result.report.report.score.toString(),
            )
              .toFixed(2)
              .toString(),
            "Last Scan Date": result.lastScanDate,
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
        } catch (err) {
          console.error("Error when transforming the following object: ");
          console.log(result);
          console.error(err);
        }
      });

      resolve(transformedResults);
    });
  },
};
