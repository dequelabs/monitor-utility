const ProjectIDsPerRequest = 100;
const ProjectsMetaPerRequest = 1; // Fetch only the latest run for each project because we are only interested in the latest scan results
const PagesPerRequest = 100;
const IssuesPerRequest = 100;

const ViolationCategory = {
  ARIA: 0,
  COLOR: 0,
  FORMS: 0,
  KEYBOARD: 0,
  LANGUAGE: 0,
  "NAME-ROLE-VALUE": 0,
  OTHER: 0,
  PARSING: 0,
  PDFWCAG: 0,
  SEMANTICS: 0,
  "SENSORY-AND-VISUAL-CUES": 0,
  STRUCTURE: 0,
  TABLES: 0,
  "TEXT-ALTERNATIVES": 0,
  "TIME-AND-MEDIA": 0,
};

//export above constants
module.exports = {
  ProjectIDsPerRequest,
  ProjectsMetaPerRequest,
  PagesPerRequest,
  IssuesPerRequest,
  ViolationCategory,
};
