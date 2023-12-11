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
            "Minor Issues": result.report.report.good.toString(),
            "Moderate Issues": result.report.report.fair.toString(),
            "Serious Issues": result.report.report.serious.toString(),
            "Critical Issues": result.report.report.critical.toString(),
            "Accessibility Score (%)": parseFloat(
              result.report.report.score.toString(),
            )
              .toFixed(2)
              .toString(),
            "Last Scan Date": result.lastScanDate,
            ARIA: getTotal("aria"),
            Color: getTotal("color"),
            Forms: getTotal("forms"),
            Keyboard: getTotal("keyboard"),
            Language: getTotal("language"),
            Media: getTotal("media"),
            "Name Role Value": getTotal("name-role-value"),
            Parsing: getTotal("parsing"),
            PDF: getTotal("pdfwcag"),
            Semantics: getTotal("semantics"),
            "Sensory and Visual Cues": getTotal("sensory-and-visual-cues"),
            Structure: getTotal("structure"),
            Tables: getTotal("tables"),
            "Text Alternatives": getTotal("text-alternatives"),
            Time: getTotal("time"),
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
