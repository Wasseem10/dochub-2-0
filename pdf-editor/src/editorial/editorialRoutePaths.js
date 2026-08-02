import { ROUTE_PATHS } from "../router/routePaths.js";

export const EDITORIAL_RESOURCE_PATHS = Object.freeze([
  ROUTE_PATHS.resources,
  ROUTE_PATHS.pdfBenchmark,
  ROUTE_PATHS.redactGuide,
  ROUTE_PATHS.ocrQualityGuide,
  ROUTE_PATHS.editPdfGuide,
  ROUTE_PATHS.compressPdfGuide,
  ROUTE_PATHS.combinePdfGuide,
  ROUTE_PATHS.fillAndSignPdfGuide,
  ROUTE_PATHS.pdfToWordGuide,
  ROUTE_PATHS.editPdfOnIphoneGuide,
  ROUTE_PATHS.editScannedPdfGuide,
  ROUTE_PATHS.compressPdfToOneMbGuide,
  ROUTE_PATHS.compressPdfForEmailGuide,
  ROUTE_PATHS.combinePdfOnMacGuide,
  ROUTE_PATHS.signPdfOnAndroidGuide,
  ROUTE_PATHS.fillPdfWithoutAdobeGuide,
  ROUTE_PATHS.pdfToWordWithoutFormattingLossGuide,
  ROUTE_PATHS.removePagesFromPdfGuide,
  ROUTE_PATHS.rotatePdfAndSaveGuide,
  ROUTE_PATHS.pdfAttachmentSizeStudy,
  ROUTE_PATHS.educationWorkflow,
  ROUTE_PATHS.recruitingWorkflow,
  ROUTE_PATHS.legalOperationsWorkflow,
  ROUTE_PATHS.realEstateWorkflow,
  ROUTE_PATHS.smallBusinessWorkflow,
  ROUTE_PATHS.privacy,
  ROUTE_PATHS.security,
  ROUTE_PATHS.architecture,
  ROUTE_PATHS.uptime,
  ROUTE_PATHS.incidentHistory,
]);

/** @type {Set<string>} */
const editorialPathSet = new Set(EDITORIAL_RESOURCE_PATHS);

/** @param {string} path */
export function isEditorialResourcePath(path) {
  return editorialPathSet.has(path);
}
