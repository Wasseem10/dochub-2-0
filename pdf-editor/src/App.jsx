import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Mail from "lucide-react/dist/esm/icons/mail.mjs";
import LogOut from "lucide-react/dist/esm/icons/log-out.mjs";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.mjs";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import Plug from "lucide-react/dist/esm/icons/plug.mjs";
import CreditCard from "lucide-react/dist/esm/icons/credit-card.mjs";
import ArrowDownToLine from "lucide-react/dist/esm/icons/arrow-down-to-line.mjs";
import AlignCenter from "lucide-react/dist/esm/icons/align-center.mjs";
import AlignLeft from "lucide-react/dist/esm/icons/align-left.mjs";
import AlignRight from "lucide-react/dist/esm/icons/align-right.mjs";
import Box from "lucide-react/dist/esm/icons/box.mjs";
import Building2 from "lucide-react/dist/esm/icons/building-2.mjs";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import CheckSquare from "lucide-react/dist/esm/icons/check-square.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.mjs";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.mjs";
import Copy from "lucide-react/dist/esm/icons/copy.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import EllipsisVertical from "lucide-react/dist/esm/icons/ellipsis-vertical.mjs";
import Eraser from "lucide-react/dist/esm/icons/eraser.mjs";
import FilePlus2 from "lucide-react/dist/esm/icons/file-plus-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Grid2X2 from "lucide-react/dist/esm/icons/grid-2x2.mjs";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.mjs";
import Highlighter from "lucide-react/dist/esm/icons/highlighter.mjs";
import Home from "lucide-react/dist/esm/icons/home.mjs";
import ImageIcon from "lucide-react/dist/esm/icons/image.mjs";
import Inbox from "lucide-react/dist/esm/icons/inbox.mjs";
import Info from "lucide-react/dist/esm/icons/info.mjs";
import List from "lucide-react/dist/esm/icons/list.mjs";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.mjs";
import MousePointer2 from "lucide-react/dist/esm/icons/mouse-pointer-2.mjs";
import Paintbrush from "lucide-react/dist/esm/icons/paintbrush.mjs";
import Palette from "lucide-react/dist/esm/icons/palette.mjs";
import PenLine from "lucide-react/dist/esm/icons/pen-line.mjs";
import Printer from "lucide-react/dist/esm/icons/printer.mjs";
import Plus from "lucide-react/dist/esm/icons/plus.mjs";
import Redo2 from "lucide-react/dist/esm/icons/redo-2.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import Save from "lucide-react/dist/esm/icons/save.mjs";
import ScanText from "lucide-react/dist/esm/icons/scan-text.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import Settings from "lucide-react/dist/esm/icons/settings.mjs";
import Share2 from "lucide-react/dist/esm/icons/share-2.mjs";
import Link from "lucide-react/dist/esm/icons/link.mjs";
import PanelsTopLeft from "lucide-react/dist/esm/icons/panels-top-left.mjs";
import Stamp from "lucide-react/dist/esm/icons/stamp.mjs";
import StickyNote from "lucide-react/dist/esm/icons/sticky-note.mjs";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import Circle from "lucide-react/dist/esm/icons/circle.mjs";
import Minus from "lucide-react/dist/esm/icons/minus.mjs";
import Move from "lucide-react/dist/esm/icons/move.mjs";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close.mjs";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open.mjs";
import RectangleHorizontal from "lucide-react/dist/esm/icons/rectangle-horizontal.mjs";
import Star from "lucide-react/dist/esm/icons/star.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Type from "lucide-react/dist/esm/icons/type.mjs";
import Undo2 from "lucide-react/dist/esm/icons/undo-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import Users from "lucide-react/dist/esm/icons/users.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import Zap from "lucide-react/dist/esm/icons/zap.mjs";
import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageReference, uploadString } from "firebase/storage";
import { db, isCloudPersistenceConfigured, storage } from "./firebase";
import { useAuth } from "./auth/AuthContext.jsx";
import { AuthRequiredModal } from "./components/editor/AuthRequiredModal.jsx";
import { BrandWordmark } from "./components/public/BrandWordmark.jsx";
import { LatticePdfLanding } from "./LatticePdfLanding.jsx";
import { EditorRouteStatePage } from "./pages/app/EditorRouteStatePage.jsx";
import { EditorToolUploadPage } from "./pages/public/EditorToolUploadPage.jsx";
import { resolveEditorDocument } from "./router/editorRouteState.js";
import { currentLocationPath, editorPath, publicEditorDocumentPath, publicEditorPath, ROUTE_PATHS } from "./router/routePaths.js";
import { getEditorToolPreset, resolveEditorActiveTool } from "./tools/editorToolPresets.js";
import { claimGuestDocument, editorActionNeedsAccount, GUEST_OWNER_ID, recoverDocumentAsGuest, resolveEditorStorageOwnerId } from "./tools/guestDocumentSession.js";
import { clearEditorSession, loadEditorSession, saveEditorSession } from "./tools/editorSessionStore.js";
import { loadLocalDocuments, saveLocalDocuments } from "./tools/localDocumentStore.js";
import { extractPdfFormAnnotations } from "./tools/pdfFormFields.js";
import { getPdfLoadErrorMessage, validatePdfUpload } from "./tools/pdfUploadValidation.js";
import { drawFlattenedInputAnnotation } from "./tools/pdfEditorAnnotationExport.js";
import { attachPdfCommentAnnotation } from "./tools/pdfCommentAnnotations.js";
import { addPdfLinkAnnotation } from "./editor/pdfLinkAnnotation.mjs";
import { protectPdfBytes } from "./tools/protectPdf.js";
import { EDITOR_TOOL_MODES, getDefaultToolForMode, getToolsForMode, resolveModeForTool } from "./tools/editorToolModes.js";
import { annotationPatchFromFrame, framesEqual, getAnnotationFrame, moveFrame, normalizeRotation, nudgeFrame, resizeFrame, rotationFromPointer } from "./tools/editorObjectTransforms.js";
import { normalizedPointerInRect } from "./tools/editorPointerCoordinates.js";
import { createTextAnnotation, estimateTextAnnotationSize, normalizeEditorText, shouldDiscardTextAnnotation } from "./tools/editorTextObjects.js";
import { canSaveEditorSignature } from "./tools/editorSignature.js";
import { duplicateEditorPageState, rotateEditorPageRecord } from "./tools/editorPageOrganizer.js";
import { appendEditorPages } from "./tools/pdfEditorPageExport.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const BASE_PAGE_WIDTH = 760;
const BASE_PAGE_HEIGHT = 984;
const EDITOR_PAGE_SCALE = 0.74;
const TEXT_SCREEN_SCALE = 1 / EDITOR_PAGE_SCALE;
const STORAGE_KEY = "paperflow.documents.v1";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ZOOM_PRESETS = [60, 80, 90, 100, 120, 140, 160];

const colors = {
  black: "#111827",
  blue: "#155ee8",
  red: "#ef3340",
  green: "#047857",
  violet: "#7c3aed",
  yellow: "#ffe66d",
};

const TEXT_FONT_OPTIONS = [
  "PP Agrandir",
  "Noto Sans",
  "Noto Serif",
  "Noto Sans Mono",
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
];

const TEXT_STANDARD_FONTS = [
  "Noto Sans",
  "Noto Serif",
  "Noto Sans Mono",
  "Courier New",
  "Helvetica",
  "Times New Roman",
  "Arial",
  "Georgia",
  "Verdana",
  "Inter",
  "PP Agrandir",
];

const SIGNATURE_FONT_OPTIONS = [
  { label: "Classic Script", value: '"Brush Script MT", "Segoe Script", cursive' },
  { label: "Elegant Script", value: '"Snell Roundhand", "Apple Chancery", cursive' },
  { label: "Handwritten", value: '"Bradley Hand", "Segoe Print", cursive' },
  { label: "Formal Cursive", value: '"Lucida Handwriting", "Segoe Script", cursive' },
  { label: "Clean Italic", value: 'Georgia, "Times New Roman", serif' },
];

const DEFAULT_SIGNATURE_FONT = SIGNATURE_FONT_OPTIONS[0].value;

const toolConfig = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "editText", label: "Edit PDF Text", icon: ScanText },
  { id: "text", label: "Text", icon: Type },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "draw", label: "Draw", icon: Paintbrush },
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "line", label: "Line", icon: Minus },
  { id: "comment", label: "Comment", icon: MessageSquare },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "checkbox", label: "Check", icon: CheckSquare },
  { id: "field", label: "Text field", icon: FilePlus2 },
  { id: "date", label: "Date", icon: CalendarDays },
  { id: "initials", label: "Initials", icon: Type },
  { id: "arrow", label: "Arrow", icon: Send },
  { id: "whiteout", label: "Whiteout", icon: Eraser },
  { id: "signature", label: "Signature", icon: PenLine },
  { id: "textHighlight", label: "Text Highlight", icon: Type },
  { id: "stamp", label: "Stamp", icon: Stamp },
  { id: "link", label: "Link", icon: Link },
];

const referencePrimaryTools = [
  { id: "text", label: "Add Text", icon: Type },
  { id: "editText", label: "Edit Text", icon: ScanText },
  { id: "signature", label: "Sign", icon: PenLine },
  { id: "draw", label: "Draw", icon: Paintbrush },
  { id: "erase", label: "Erase", icon: Eraser },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "textHighlight", label: "Text Highlight", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "stamp", label: "Stamp", icon: Stamp },
  { id: "link", label: "Link", icon: Link },
  { id: "note", label: "Note", icon: StickyNote },
];

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowIso() {
  return new Date().toISOString();
}

function isEditableTarget(target) {
  return Boolean(target?.closest?.("textarea, input, select, [contenteditable], .text-content, .detected-text-content"));
}

function formatDateTime(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function userDocumentStorageKey(userId) {
  return `${STORAGE_KEY}:${userId}`;
}

function safeLoadDocuments(userId) {
  if (!userId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(userDocumentStorageKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cloudDocumentPayloadPath(userId, documentId) {
  return `users/${userId}/documents/${documentId}/document.json`;
}

function toCloudDocumentMetadata(userId, documentRecord) {
  const payloadPath = cloudDocumentPayloadPath(userId, documentRecord.id);
  return {
    id: documentRecord.id,
    ownerId: userId,
    name: documentRecord.name || "Untitled document.pdf",
    size: documentRecord.size || 0,
    source: documentRecord.source || "blank",
    pageCount: documentRecord.pageCount || documentRecord.pages?.length || 1,
    status: documentRecord.status || "Ready",
    location: documentRecord.location || "My documents",
    favorite: !!documentRecord.favorite,
    uploadedAt: documentRecord.uploadedAt || nowIso(),
    updatedAt: documentRecord.updatedAt || nowIso(),
    payloadPath,
  };
}

function mergeDocumentsByUpdatedAt(localDocuments, cloudDocuments) {
  const records = new Map();
  [...localDocuments, ...cloudDocuments].forEach((documentRecord) => {
    if (!documentRecord?.id) return;
    const current = records.get(documentRecord.id);
    const currentTime = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const nextTime = documentRecord.updatedAt ? new Date(documentRecord.updatedAt).getTime() : 0;
    if (!current || nextTime >= currentTime) records.set(documentRecord.id, documentRecord);
  });
  return Array.from(records.values()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

async function uploadDocumentRecordToCloud(userId, documentRecord) {
  if (!isCloudPersistenceConfigured || !userId || !documentRecord?.id) return;
  const payloadPath = cloudDocumentPayloadPath(userId, documentRecord.id);
  const payload = JSON.stringify({
    ...documentRecord,
    cloudBacked: true,
    cloudPayloadPath: payloadPath,
  });
  await uploadString(storageReference(storage, payloadPath), payload, "raw", {
    contentType: "application/json",
  });
  await setDoc(doc(db, "users", userId, "documents", documentRecord.id), toCloudDocumentMetadata(userId, documentRecord), { merge: true });
}

async function deleteDocumentRecordFromCloud(userId, documentId) {
  if (!isCloudPersistenceConfigured || !userId || !documentId) return;
  await deleteDoc(doc(db, "users", userId, "documents", documentId));
  try {
    await deleteObject(storageReference(storage, cloudDocumentPayloadPath(userId, documentId)));
  } catch {
    // The metadata delete is enough if the payload was never uploaded or was already removed.
  }
}

async function loadCloudDocumentRecords(userId) {
  if (!isCloudPersistenceConfigured || !userId) return [];
  const snapshot = await getDocs(collection(db, "users", userId, "documents"));
  const records = await Promise.all(snapshot.docs.map(async (metadataDoc) => {
    const metadata = metadataDoc.data();
    if (!metadata?.payloadPath) return { ...metadata, id: metadataDoc.id };

    try {
      const payloadUrl = await getDownloadURL(storageReference(storage, metadata.payloadPath));
      const response = await fetch(payloadUrl);
      const payload = await response.json();
      return {
        ...payload,
        ...metadata,
        id: metadataDoc.id,
        cloudBacked: true,
        cloudPayloadPath: metadata.payloadPath,
      };
    } catch {
      return { ...metadata, id: metadataDoc.id, cloudBacked: true };
    }
  }));
  return records;
}

function arrayBufferToDataUrl(buffer) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(new Blob([buffer], { type: "application/pdf" }));
  });
}

async function dataUrlToArrayBuffer(dataUrl) {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

async function embedDataUrlImage(pdfDoc, dataUrl) {
  if (!dataUrl) return null;
  const bytes = await dataUrlToArrayBuffer(dataUrl);
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")
    ? pdfDoc.embedJpg(bytes)
    : pdfDoc.embedPng(bytes);
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({
        dataUrl: reader.result,
        name: file.name,
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      });
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = "none";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function normalizeHexColor(value) {
  const clean = String(value || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return `#${clean.toLowerCase()}`;
}

function pointerToNormalized(event, pageElement) {
  const drawingSurface = pageElement.querySelector(".annotation-layer") || pageElement;
  return normalizedPointerInRect(event, drawingSurface.getBoundingClientRect());
}

function rotatePdfPoint(point, center, rotation = 0) {
  const radians = (Number(rotation || 0) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cosine - dy * sine,
    y: center.y + dx * sine + dy * cosine,
  };
}

function extractDetectedTextItems(textContent, viewport, pageRecord, pageIndex) {
  const rawItems = textContent.items
    .filter((item) => item.str?.trim())
    .map((item, index) => {
      const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const rawHeight = Math.hypot(transform[2], transform[3]) || Math.abs(item.height || 10);
      const rawWidth = Math.max(item.width || 0, item.str.length * rawHeight * 0.42);
      const left = transform[4];
      const top = transform[5] - rawHeight;
      const right = left + rawWidth;
      const bottom = top + rawHeight;
      const x = clamp(left / viewport.width, 0, 0.98);
      const y = clamp(top / viewport.height, 0, 0.98);
      const w = clamp(rawWidth / viewport.width, 0.012, 0.86);
      const h = clamp((rawHeight * 1.22) / viewport.height, 0.012, 0.16);
      const fontSize = clamp((rawHeight / viewport.height) * pageRecord.height, 6, 42);

      return {
        id: makeId("detected-text"),
        pageNumber: pageIndex,
        originalText: item.str,
        currentText: item.str,
        x,
        y,
        w: Math.min(w, 0.98 - x),
        h: Math.min(h, 0.98 - y),
        left,
        right,
        top,
        bottom,
        rawHeight,
        rawWidth,
        centerY: top + rawHeight / 2,
        fontSize,
        fontFamily: item.fontName || "Helvetica",
        color: colors.black,
        rotation: 0,
        source: "pdf-text-layer",
        confidence: 1,
        isEdited: false,
        isDeleted: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
    });

  const lines = [];
  rawItems
    .slice()
    .sort((a, b) => (a.centerY - b.centerY) || (a.left - b.left))
    .forEach((item) => {
      const line = lines.find((candidate) => Math.abs(candidate.centerY - item.centerY) <= Math.max(candidate.avgHeight, item.rawHeight) * 0.62);
      if (!line) {
        lines.push({ centerY: item.centerY, avgHeight: item.rawHeight, items: [item] });
        return;
      }
      line.items.push(item);
      line.avgHeight = line.items.reduce((total, candidate) => total + candidate.rawHeight, 0) / line.items.length;
      line.centerY = line.items.reduce((total, candidate) => total + candidate.centerY, 0) / line.items.length;
    });

  const mergedItems = [];
  lines.forEach((line) => {
    const sorted = line.items.slice().sort((a, b) => a.left - b.left);
    let segment = [];
    const flushSegment = () => {
      if (!segment.length) return;
      const left = Math.min(...segment.map((item) => item.left));
      const right = Math.max(...segment.map((item) => item.right));
      const top = Math.min(...segment.map((item) => item.top));
      const bottom = Math.max(...segment.map((item) => item.bottom));
      const avgHeight = segment.reduce((total, item) => total + item.rawHeight, 0) / segment.length;
      const fontSize = segment.reduce((total, item) => total + item.fontSize, 0) / segment.length;
      const originalText = segment.reduce((text, item, index) => {
        if (index === 0) return item.originalText;
        const previous = segment[index - 1];
        const gap = item.left - previous.right;
        const needsSpace = gap > Math.max(2, avgHeight * 0.22) && !/\s$/.test(text) && !/^\s/.test(item.originalText);
        return `${text}${needsSpace ? " " : ""}${item.originalText}`;
      }, "").replace(/\s+/g, " ").trim();
      const boxHeight = Math.max(bottom - top, avgHeight) * 1.32;
      const boxTop = top - Math.max(0, (boxHeight - (bottom - top)) / 2);
      const x = clamp(left / viewport.width, 0, 0.98);
      const y = clamp(boxTop / viewport.height, 0, 0.98);
      const w = clamp((right - left) / viewport.width, 0.014, 0.94);
      const h = clamp(boxHeight / viewport.height, 0.014, 0.22);

      if (originalText && w > 0.006 && h > 0.006) {
        mergedItems.push({
          ...segment[0],
          id: makeId("detected-text"),
          originalText,
          currentText: originalText,
          x,
          y,
          w: Math.min(w, 0.98 - x),
          h: Math.min(h, 0.98 - y),
          fontSize,
          fontFamily: segment[0].fontFamily,
          source: "pdf-text-line",
        });
      }
      segment = [];
    };

    sorted.forEach((item) => {
      const previous = segment[segment.length - 1];
      const gap = previous ? item.left - previous.right : 0;
      const maxInlineGap = Math.max(line.avgHeight * 3.2, viewport.width * 0.045);
      if (previous && gap > maxInlineGap) {
        flushSegment();
      }
      segment.push(item);
    });
    flushSegment();
  });

  return mergedItems;
}

function samplePages() {
  return [
    { id: "sample-1", number: 1, width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT, source: "sample" },
    { id: "sample-2", number: 2, width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT, source: "sample" },
    { id: "sample-3", number: 3, width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT, source: "sample" },
  ];
}

function initialAnnotations() {
  return [
    {
      id: makeId("text"),
      type: "text",
      page: 0,
      x: 0.647,
      y: 0.21,
      w: 0.22,
      h: 0.074,
      content: "Project Manager\nJane Smith",
      color: colors.black,
      fontSize: 18,
      bold: true,
      italic: false,
      underline: false,
      opacity: 1,
    },
    {
      id: makeId("highlight"),
      type: "highlight",
      page: 0,
      x: 0.13,
      y: 0.692,
      w: 0.55,
      h: 0.06,
      color: colors.yellow,
      opacity: 0.72,
    },
    {
      id: makeId("draw"),
      type: "draw",
      page: 0,
      color: "#047857",
      strokeWidth: 5,
      opacity: 1,
      points: [
        { x: 0.78, y: 0.45 },
        { x: 0.795, y: 0.492 },
        { x: 0.82, y: 0.433 },
        { x: 0.865, y: 0.392 },
      ],
    },
    {
      id: makeId("signature"),
      type: "signature",
      page: 0,
      x: 0.53,
      y: 0.765,
      w: 0.22,
      h: 0.052,
      content: "Jane Smith",
      color: "#0f172a",
      fontSize: 25,
      fontFamily: DEFAULT_SIGNATURE_FONT,
      opacity: 1,
    },
  ];
}

function SampleDocument({ pageIndex }) {
  if (pageIndex === 1) {
    return (
      <div className="sample-doc">
        <h1>Statement of Work</h1>
        <p>This statement defines deliverables, acceptance criteria, and the working process for the engagement.</p>
        <h2>1. Deliverables</h2>
        <p>Provider will deliver research notes, annotated drafts, implementation support, and final documentation.</p>
        <h2>2. Timeline</h2>
        <p>The expected delivery window is six weeks from project kickoff, subject to timely review cycles.</p>
        <h2>3. Acceptance</h2>
        <p>Client will review all materials within five business days and provide consolidated feedback.</p>
      </div>
    );
  }

  if (pageIndex === 2) {
    return (
      <div className="sample-doc">
        <h1>Exhibit B</h1>
        <p>Payment schedule and invoice terms for the service agreement.</p>
        <table>
          <tbody>
            <tr>
              <th>Milestone</th>
              <th>Amount</th>
              <th>Due</th>
            </tr>
            <tr>
              <td>Project kickoff</td>
              <td>$4,000</td>
              <td>Upon signature</td>
            </tr>
            <tr>
              <td>Draft delivery</td>
              <td>$6,500</td>
              <td>Net 15</td>
            </tr>
            <tr>
              <td>Final delivery</td>
              <td>$4,500</td>
              <td>Net 15</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="sample-doc">
      <h1>SERVICE AGREEMENT</h1>
      <p>
        This Service Agreement (&quot;Agreement&quot;) is made and entered into as of <strong>May 15, 2024</strong>, by
        and between:
      </p>
      <div className="party-grid">
        <strong>Client:</strong>
        <span>Acme Corporation<br />123 Business Way, Suite 100<br />Austin, TX 78701</span>
        <strong>Provider:</strong>
        <span>Northfield Solutions, LLC<br />500 Innovation Drive, Suite 200<br />Austin, TX 78759</span>
      </div>
      <p>Collectively, the Client and Provider may be referred to as the &quot;Parties&quot; and individually as a &quot;Party.&quot;</p>
      <hr />
      <h2>1. Scope of Services</h2>
      <p>Provider agrees to perform the services described in Exhibit A. All services will be performed in a professional and workmanlike manner.</p>
      <h2>2. Term</h2>
      <p>This Agreement shall commence on May 15, 2024 and shall continue for twelve months unless terminated earlier in accordance with Section 8.</p>
      <h2>3. Payment Terms</h2>
      <p>Client shall pay Provider the fees set forth in Exhibit B. All invoices are due within thirty days of receipt.</p>
      <h2>4. Confidentiality</h2>
      <p>Each Party agrees to keep confidential all non-public information disclosed by the other Party.</p>
      <div className="signature-lines">
        <div><strong>Client: Acme Corporation</strong><span>By:</span><span>Name:</span><span>Title:</span><span>Date:</span></div>
        <div><strong>Provider: Northfield Solutions, LLC</strong><span>By:</span><span>Name:</span><span>Title:</span><span>Date:</span></div>
      </div>
    </div>
  );
}

function BlankDocument() {
  return <div className="blank-doc" aria-label="Blank PDF page" />;
}

const EditableTextContent = forwardRef(function EditableTextContent({
  ariaLabel = "Text box content",
  className,
  editable,
  onBlur,
  onChange,
  onFocus,
  onPointerDown,
  spellCheck = "false",
  value,
}, forwardedRef) {
  const elementRef = useRef(null);

  const setElementRef = useCallback((element) => {
    elementRef.current = element;
    if (typeof forwardedRef === "function") {
      forwardedRef(element);
    } else if (forwardedRef) {
      forwardedRef.current = element;
    }
  }, [forwardedRef]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const nextValue = value || "";
    if (document.activeElement === element) return;
    if (element.innerText !== nextValue) {
      element.innerText = nextValue;
    }
  }, [value]);

  const emitChange = (event) => {
    onChange?.(event.currentTarget);
  };

  return (
    <div
      ref={setElementRef}
      className={className}
      contentEditable={editable ? "plaintext-only" : false}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      aria-readonly={!editable}
      suppressContentEditableWarning
      spellCheck={spellCheck}
      onPointerDown={onPointerDown}
      onInput={emitChange}
      onFocus={onFocus}
      onPaste={(event) => {
        if (!editable) return;
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") || "";
        document.execCommand("insertText", false, text);
      }}
      onKeyDown={(event) => {
        if (editable && event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        emitChange(event);
        onBlur?.(event);
      }}
    />
  );
});

function Annotation({ annotation, selected, zoom, onSelect, onDrag, onResize, onUpdate, onDelete }) {
  const textContentRef = useRef(null);
  const textWasFocusedRef = useRef(false);
  const displayScale = (zoom / 100) * EDITOR_PAGE_SCALE;
  const textDisplayScale = displayScale * TEXT_SCREEN_SCALE;
  const commonStyle = {
    left: `${annotation.x * 100}%`,
    top: `${annotation.y * 100}%`,
    width: `${annotation.w * 100}%`,
    height: `${annotation.h * 100}%`,
    opacity: annotation.opacity,
  };

  const dragStart = (event) => {
    if (event.target.closest?.(".text-content")) {
      event.stopPropagation();
      onSelect(annotation.id);
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pageRect = event.currentTarget.closest(".page-surface").getBoundingClientRect();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: annotation.x, y: annotation.y };
    onSelect(annotation.id);
    const move = (moveEvent) => {
      onDrag(annotation.id, {
        x: origin.x + (moveEvent.clientX - origin.clientX) / pageRect.width,
        y: origin.y + (moveEvent.clientY - origin.clientY) / pageRect.height,
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    if (annotation.type !== "text") return undefined;
    if (!selected) {
      textWasFocusedRef.current = false;
      return undefined;
    }
    if (textWasFocusedRef.current) return undefined;

    textWasFocusedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const textElement = textContentRef.current;
      if (!textElement) return;

      textElement.focus({ preventScroll: true });
      const selection = window.getSelection();
      if (!selection) return;

      const range = window.document.createRange();
      range.selectNodeContents(textElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [annotation.id, annotation.type, selected]);

  const resizeStart = (event) => {
    event.stopPropagation();
    const pageRect = event.currentTarget.closest(".page-surface").getBoundingClientRect();
    const origin = { clientX: event.clientX, clientY: event.clientY, w: annotation.w, h: annotation.h };
    const move = (moveEvent) => {
      onResize(annotation.id, {
        w: origin.w + (moveEvent.clientX - origin.clientX) / pageRect.width,
        h: origin.h + (moveEvent.clientY - origin.clientY) / pageRect.height,
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const updateTextContent = (textElement) => {
    const pageRect = textElement.closest(".page-surface")?.getBoundingClientRect();
    const content = normalizeEditorText(textElement.innerText);
    const patch = { content: content || " " };

    if (pageRect?.width && pageRect?.height) {
      const fontPx = Math.max(8, (annotation.fontSize || 16) * textDisplayScale);
      const estimated = estimateTextAnnotationSize({
        content,
        fontSize: fontPx,
        lineHeight: annotation.lineHeight || 1.25,
        pageWidth: pageRect.width,
        pageHeight: pageRect.height,
      });
      patch.w = estimated.w;
      patch.h = estimated.h;
    }

    onUpdate(annotation.id, patch);
  };

  if (annotation.type === "draw") {
    const points = annotation.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
    const normalizedStrokeWidth = Math.max(0.15, (annotation.strokeWidth / BASE_PAGE_WIDTH) * 100);
    return (
      <svg className={`ink-layer ${selected ? "is-selected" : ""}`} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={(event) => { event.stopPropagation(); onSelect(annotation.id); }}>
        <polyline points={points} fill="none" stroke={annotation.color} strokeWidth={normalizedStrokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={annotation.opacity} />
      </svg>
    );
  }

  if (annotation.type === "highlight") {
    return (
      <div className={`annotation highlight ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, backgroundColor: annotation.color }} onPointerDown={dragStart}>
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "whiteout") {
    return (
      <div className={`annotation whiteout ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "checkbox") {
    return (
      <div
        className={`annotation checkbox-field ${selected ? "is-selected" : ""}`}
        style={{ ...commonStyle, "--checkbox-color": annotation.color }}
        onPointerDown={dragStart}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onUpdate(annotation.id, { checked: !annotation.checked });
        }}
        role="checkbox"
        aria-checked={Boolean(annotation.checked)}
        aria-label={annotation.fieldName || "PDF checkbox"}
        title="Double-click to toggle"
      >
        {annotation.checked && <span className="checkbox-mark" />}
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "rectangle" || annotation.type === "circle") {
    return (
      <div
        className={`annotation shape ${annotation.type} ${selected ? "is-selected" : ""}`}
        style={{
          ...commonStyle,
          borderColor: annotation.color,
          borderWidth: `${Math.max(1, annotation.strokeWidth || 2)}px`,
          backgroundColor: annotation.fillColor || "transparent",
        }}
        onPointerDown={dragStart}
      >
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "line" || annotation.type === "arrow") {
    return (
      <div className={`annotation line-box ${annotation.type === "arrow" ? "arrow-line" : ""} ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100" y2="100" stroke={annotation.color} strokeWidth={Math.max(1, annotation.strokeWidth || 3)} strokeLinecap="round" opacity={annotation.opacity} />
          {annotation.type === "arrow" && (
            <polyline points="78,100 100,100 100,78" fill="none" stroke={annotation.color} strokeWidth={Math.max(1, annotation.strokeWidth || 3)} strokeLinecap="round" strokeLinejoin="round" opacity={annotation.opacity} />
          )}
        </svg>
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "comment") {
    return (
      <div className={`annotation comment-marker ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <MessageSquare size={Math.max(16, 20 * (zoom / 100))} />
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "signature" || annotation.type === "initials") {
    return (
      <div
        className={`annotation signature ${annotation.type === "initials" ? "initials" : ""} ${selected ? "is-selected" : ""}`}
        style={{
          ...commonStyle,
          color: annotation.color,
          fontFamily: annotation.fontFamily || (annotation.type === "signature" ? DEFAULT_SIGNATURE_FONT : '"PP Agrandir", Inter, Arial, sans-serif'),
          fontSize: `${annotation.fontSize * displayScale}px`,
        }}
        onPointerDown={dragStart}
      >
        {annotation.imageDataUrl ? <img src={annotation.imageDataUrl} alt="Signature" /> : annotation.content}
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "image") {
    return (
      <div className={`annotation image-annotation ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <img src={annotation.imageDataUrl} alt={annotation.content || "Inserted image"} />
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  if (annotation.type === "field") {
    return (
      <div className={`annotation fillable-field ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, "--field-color": annotation.color }} onPointerDown={dragStart}>
        <input
          aria-label={annotation.fieldName || "PDF text field"}
          value={annotation.content || ""}
          placeholder={annotation.fieldName || "Enter text"}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect(annotation.id);
          }}
          onChange={(event) => onUpdate(annotation.id, { content: event.target.value })}
        />
        {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
      </div>
    );
  }

  return (
    <div
      className={`annotation text-box ${selected ? "is-selected" : ""}`}
      style={{
        ...commonStyle,
        color: annotation.color,
        fontFamily: annotation.fontFamily || '"PP Agrandir", Inter, Arial, sans-serif',
        fontSize: `${annotation.fontSize * textDisplayScale}px`,
        fontWeight: annotation.bold ? 850 : 500,
        fontStyle: annotation.italic ? "italic" : "normal",
        textDecoration: annotation.underline ? "underline" : "none",
        textAlign: annotation.textAlign || "left",
        lineHeight: annotation.lineHeight || 1.25,
      }}
      onPointerDown={dragStart}
    >
      {selected && (
        <div className="annotation-mini-menu" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" className="mini-grip" title="Move" onPointerDown={dragStart}><GripVertical size={15} /></button>
          <button type="button" title="Quick format" onClick={() => onUpdate(annotation.id, { bold: !annotation.bold })}><Type size={15} /></button>
          <button type="button" title="Delete" onClick={() => onDelete(annotation.id)}><Trash2 size={15} /></button>
        </div>
      )}
      <EditableTextContent
        ref={textContentRef}
        className="text-content"
        editable={selected}
        spellCheck="false"
        value={annotation.content}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(annotation.id);
        }}
        onChange={updateTextContent}
      />
      {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
    </div>
  );
}

function EditorSelectionControls({ onDelete, onMoveStart, onResizeStart, onRotate, onRotateStart }) {
  return (
    <>
      <div className="annotation-mini-menu annotation-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" className="mini-grip move-control" title="Move" aria-label="Move object" onPointerDown={onMoveStart}><GripVertical size={15} /></button>
        <button type="button" title="Rotate 15 degrees" aria-label="Rotate object 15 degrees" onClick={onRotate}><RotateCw size={15} /></button>
        <button type="button" title="Delete" aria-label="Delete object" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
      <span className="rotation-stem" aria-hidden="true" />
      <button type="button" className="rotation-handle" title="Rotate object" aria-label="Rotate object" onPointerDown={onRotateStart} />
      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
        <button key={handle} type="button" className={`resize-control resize-${handle}`} aria-label={`Resize object ${handle}`} onPointerDown={(event) => onResizeStart(event, handle)} />
      ))}
    </>
  );
}

function ProfessionalAnnotation({ annotation, selected, zoom, activeTool, onSelect, onCommit, onUpdate, onDelete }) {
  const textContentRef = useRef(null);
  const textMeasureCanvasRef = useRef(null);
  const textWasFocusedRef = useRef(false);
  const textDraftRef = useRef(annotation.content || "");
  const gestureFrameRef = useRef(getAnnotationFrame(annotation));
  const [liveFrame, setLiveFrame] = useState(() => getAnnotationFrame(annotation));
  const displayScale = (zoom / 100) * EDITOR_PAGE_SCALE;
  const textDisplayScale = displayScale * TEXT_SCREEN_SCALE;

  useEffect(() => {
    const nextFrame = getAnnotationFrame(annotation);
    gestureFrameRef.current = nextFrame;
    setLiveFrame(nextFrame);
    textDraftRef.current = annotation.content || "";
  }, [annotation]);

  useEffect(() => {
    if (annotation.type !== "text") return undefined;
    if (!selected) {
      textWasFocusedRef.current = false;
      return undefined;
    }
    if (textWasFocusedRef.current) return undefined;
    textWasFocusedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const textElement = textContentRef.current;
      if (!textElement) return;
      textElement.focus({ preventScroll: true });
      const selection = window.getSelection();
      if (!selection) return;
      const range = window.document.createRange();
      range.selectNodeContents(textElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [annotation.id, annotation.type, selected]);

  const beginFrameGesture = (event, kind, handle = "") => {
    if (kind === "move" && event.target.closest?.("input, [contenteditable='true']") && !event.target.closest?.(".move-control")) {
      event.stopPropagation();
      onSelect(annotation.id);
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pageRect = event.currentTarget.closest(".page-surface")?.getBoundingClientRect();
    if (!pageRect?.width || !pageRect?.height) return;
    const originFrame = getAnnotationFrame(annotation);
    const origin = { clientX: event.clientX, clientY: event.clientY };
    const initialPointerRotation = rotationFromPointer(originFrame, pageRect, event.clientX, event.clientY);
    const rotationOffset = normalizeRotation(originFrame.rotation - initialPointerRotation);
    gestureFrameRef.current = originFrame;
    onSelect(annotation.id);

    const move = (moveEvent) => {
      const deltaX = (moveEvent.clientX - origin.clientX) / pageRect.width;
      const deltaY = (moveEvent.clientY - origin.clientY) / pageRect.height;
      const nextFrame = kind === "resize"
        ? resizeFrame(originFrame, handle, deltaX, deltaY, annotation.type === "text" ? { minWidth: 0.16, minHeight: 0.05 } : undefined)
        : kind === "rotate"
          ? { ...originFrame, rotation: rotationFromPointer(originFrame, pageRect, moveEvent.clientX, moveEvent.clientY, rotationOffset) }
          : moveFrame(originFrame, deltaX, deltaY);
      gestureFrameRef.current = nextFrame;
      setLiveFrame(nextFrame);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const nextFrame = gestureFrameRef.current;
      if (!framesEqual(originFrame, nextFrame)) onCommit(annotation.id, annotationPatchFromFrame(annotation, nextFrame, originFrame));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const dragStart = (event) => {
    if (activeTool === "erase") {
      event.stopPropagation();
      event.preventDefault();
      onDelete(annotation.id);
      return;
    }
    beginFrameGesture(event, "move");
  };
  const resizeStart = (event, handle) => beginFrameGesture(event, "resize", handle);
  const rotateStart = (event) => beginFrameGesture(event, "rotate");
  const rotateStep = () => onCommit(annotation.id, { rotation: normalizeRotation((annotation.rotation || 0) + 15) });
  const commonStyle = {
    left: `${liveFrame.x * 100}%`,
    top: `${liveFrame.y * 100}%`,
    width: `${liveFrame.w * 100}%`,
    height: `${liveFrame.h * 100}%`,
    opacity: annotation.opacity,
    transform: `rotate(${liveFrame.rotation || 0}deg)`,
    transformOrigin: "center",
    "--annotation-counter-rotation": `${-(liveFrame.rotation || 0)}deg`,
  };
  const controls = selected ? (
    <EditorSelectionControls
      onDelete={() => onDelete(annotation.id)}
      onMoveStart={dragStart}
      onResizeStart={resizeStart}
      onRotate={rotateStep}
      onRotateStart={rotateStart}
    />
  ) : null;

  const updateTextContent = (element) => {
    const pageRect = element.closest(".page-surface")?.getBoundingClientRect();
    const content = normalizeEditorText(element.innerText);
    textDraftRef.current = content;
    if (!pageRect?.width || !pageRect?.height) return;
    const fontPx = Math.max(8, (annotation.fontSize || 16) * textDisplayScale);
    const currentFrame = gestureFrameRef.current;
    const canvas = textMeasureCanvasRef.current || document.createElement("canvas");
    textMeasureCanvasRef.current = canvas;
    const context = canvas.getContext("2d");
    const computedStyle = window.getComputedStyle(element);
    if (context) {
      context.font = `${computedStyle.fontStyle} ${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    }
    const estimated = estimateTextAnnotationSize({
      content,
      fontSize: fontPx,
      lineHeight: annotation.lineHeight || 1.25,
      pageWidth: pageRect.width,
      pageHeight: pageRect.height,
      maxWidth: clamp(0.98 - currentFrame.x, 0.16, 0.78),
      maxHeight: clamp(0.98 - currentFrame.y, 0.05, 0.42),
      measureLine: context ? (line) => context.measureText(line || " ").width : undefined,
    });
    const nextFrame = {
      ...currentFrame,
      w: estimated.w,
      h: estimated.h,
    };
    gestureFrameRef.current = nextFrame;
    setLiveFrame(nextFrame);
  };

  const commitTextContent = () => {
    const content = textDraftRef.current;
    if (shouldDiscardTextAnnotation(content)) {
      onDelete(annotation.id);
      return;
    }
    onCommit(annotation.id, {
      ...annotationPatchFromFrame(annotation, gestureFrameRef.current, getAnnotationFrame(annotation)),
      content,
      updatedAt: nowIso(),
    });
  };

  if (annotation.type === "draw") {
    const points = (annotation.points || []).map((point) => `${((point.x - liveFrame.x) / liveFrame.w) * 100},${((point.y - liveFrame.y) / liveFrame.h) * 100}`).join(" ");
    return (
      <div className={`annotation ink-annotation ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points} fill="none" stroke={annotation.color} strokeWidth={Math.max(0.4, annotation.strokeWidth || 3)} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity={annotation.opacity} /></svg>
        {controls}
      </div>
    );
  }

  if (annotation.type === "highlight" || annotation.type === "whiteout") {
    return <div className={`annotation ${annotation.type} ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, backgroundColor: annotation.type === "highlight" ? annotation.color : "#ffffff" }} onPointerDown={dragStart}>{controls}</div>;
  }

  if (annotation.type === "checkbox") {
    return (
      <div className={`annotation checkbox-field ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, "--checkbox-color": annotation.color }} onPointerDown={dragStart} onDoubleClick={(event) => { event.stopPropagation(); onUpdate(annotation.id, { checked: !annotation.checked }); }} role="checkbox" aria-checked={Boolean(annotation.checked)} aria-label={annotation.fieldName || "PDF checkbox"} title="Double-click to toggle">
        {annotation.checked && <span className="checkbox-mark" />}{controls}
      </div>
    );
  }

  if (annotation.type === "rectangle" || annotation.type === "circle") {
    return <div className={`annotation shape ${annotation.type} ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, borderColor: annotation.color, borderWidth: `${Math.max(1, annotation.strokeWidth || 2)}px`, backgroundColor: annotation.fillColor || "transparent" }} onPointerDown={dragStart}>{controls}</div>;
  }

  if (annotation.type === "line" || annotation.type === "arrow") {
    return (
      <div className={`annotation line-box ${annotation.type === "arrow" ? "arrow-line" : ""} ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="0" x2="100" y2="100" stroke={annotation.color} strokeWidth={Math.max(1, annotation.strokeWidth || 3)} vectorEffect="non-scaling-stroke" strokeLinecap="round" opacity={annotation.opacity} />{annotation.type === "arrow" && <polyline points="78,100 100,100 100,78" fill="none" stroke={annotation.color} strokeWidth={Math.max(1, annotation.strokeWidth || 3)} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity={annotation.opacity} />}</svg>
        {controls}
      </div>
    );
  }

  if (annotation.type === "stamp") {
    return <div className={`annotation stamp-annotation ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, color: annotation.color }} onPointerDown={dragStart}><span>{annotation.content || "APPROVED"}</span>{controls}</div>;
  }

  if (annotation.type === "link") {
    return (
      <div
        className={`annotation link-annotation ${selected ? "is-selected" : ""}`}
        style={{ ...commonStyle, color: annotation.color }}
        onPointerDown={dragStart}
        onDoubleClick={(event) => {
          event.stopPropagation();
          const nextUrl = window.prompt("Link address", annotation.url || "https://");
          if (!nextUrl?.trim()) return;
          const normalizedUrl = /^https?:\/\//i.test(nextUrl.trim()) ? nextUrl.trim() : `https://${nextUrl.trim()}`;
          onUpdate(annotation.id, { url: normalizedUrl, content: normalizedUrl.replace(/^https?:\/\//i, "") });
        }}
      >
        <Link size={Math.max(13, 15 * (zoom / 100))} />
        <span>{annotation.content || annotation.url || "Link"}</span>
        {controls}
      </div>
    );
  }

  if (annotation.type === "comment") {
    return (
      <div className={`annotation comment-marker ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}>
        <StickyNote size={Math.max(16, 20 * (zoom / 100))} />
        {selected && <textarea className="comment-editor" aria-label="Note text" value={annotation.content || ""} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onUpdate(annotation.id, { content: event.target.value, updatedAt: nowIso() })} placeholder="Write a note…" autoFocus />}
        {controls}
      </div>
    );
  }

  if (annotation.type === "signature" || annotation.type === "initials") {
    return <div className={`annotation signature ${annotation.type === "initials" ? "initials" : ""} ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, color: annotation.color, fontFamily: annotation.fontFamily || (annotation.type === "signature" ? DEFAULT_SIGNATURE_FONT : "Arial, Helvetica, sans-serif"), fontSize: `${annotation.fontSize * displayScale}px` }} onPointerDown={dragStart}>{annotation.imageDataUrl ? <img src={annotation.imageDataUrl} alt="Signature" /> : annotation.content}{controls}</div>;
  }

  if (annotation.type === "image") return <div className={`annotation image-annotation ${selected ? "is-selected" : ""}`} style={commonStyle} onPointerDown={dragStart}><img src={annotation.imageDataUrl} alt={annotation.content || "Inserted image"} />{controls}</div>;

  if (annotation.type === "field") {
    return (
      <div className={`annotation fillable-field ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, "--field-color": annotation.color }} onPointerDown={dragStart}>
        <input aria-label={annotation.fieldName || "PDF text field"} value={annotation.content || ""} placeholder={annotation.fieldName || "Enter text"} onPointerDown={(event) => { event.stopPropagation(); onSelect(annotation.id); }} onChange={(event) => onUpdate(annotation.id, { content: event.target.value, updatedAt: nowIso() })} />
        {controls}
      </div>
    );
  }

  return (
    <div className={`annotation text-box ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, color: annotation.color, fontFamily: annotation.fontFamily || "Arial, Helvetica, sans-serif", fontSize: `${annotation.fontSize * textDisplayScale}px`, fontWeight: annotation.bold ? 700 : 500, fontStyle: annotation.italic ? "italic" : "normal", textDecoration: annotation.underline ? "underline" : "none", textAlign: annotation.textAlign || "left", lineHeight: annotation.lineHeight || 1.25 }} onPointerDown={dragStart}>
      {controls}
      <EditableTextContent ref={textContentRef} ariaLabel="Edit text box" className="text-content" editable={selected} spellCheck="false" value={annotation.content} onPointerDown={(event) => { event.stopPropagation(); onSelect(annotation.id); }} onChange={updateTextContent} onBlur={commitTextContent} />
    </div>
  );
}

export function EditorBrandButton({ onDashboard }) {
  return (
    <button
      type="button"
      className="reference-brand-name reference-brand-button"
      onClick={onDashboard}
      title="Back to dashboard"
      aria-label="Back to FixThatPDF dashboard"
    >
      <BrandWordmark />
    </button>
  );
}

export function App({ view = "landing", appSection = "Home", authMode = "login", documentId = "", publicTool = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    authReady,
    currentUser,
    isFirebaseConfigured,
    authenticate,
    resetPassword,
    logout: logoutAuth,
  } = useAuth();
  const isPublicEditor = view === "tool-upload" || view === "public-editor";
  const storageOwnerId = resolveEditorStorageOwnerId(isPublicEditor, currentUser);
  const fileInputRef = useRef(null);
  const sourceFileRef = useRef(null);
  const authHandoffStartedRef = useRef(false);
  const appendFileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const zoomMenuRef = useRef(null);
  const canvasColumnRef = useRef(null);
  const publicDocumentRecoveryRef = useRef(new Set());
  const lastPagePointRef = useRef({ x: 0.52, y: 0.28 });
  const editorClipboardRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [documentCatalogReady, setDocumentCatalogReady] = useState(!isCloudPersistenceConfigured);
  const [editorRouteState, setEditorRouteState] = useState("idle");
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [pages, setPages] = useState([]);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState("New Document");
  const [tool, setTool] = useState("select");
  const [activeToolMode, setActiveToolMode] = useState("view");
  const [pageIndex, setPageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [detectedTextItems, setDetectedTextItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetectedTextId, setSelectedDetectedTextId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [saved, setSaved] = useState(true);
  const [saveState, setSaveState] = useState("saved");
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(isCloudPersistenceConfigured ? "idle" : "local");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [draft, setDraft] = useState(null);
  const [signatureText, setSignatureText] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [draggedPageIndex, setDraggedPageIndex] = useState(null);
  const [pageDropIndex, setPageDropIndex] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadStage, setUploadStage] = useState({ status: "idle", percent: 0, fileName: "" });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState("");
  const [isPagesCollapsed, setIsPagesCollapsed] = useState(false);
  const [isPageAppendMenuOpen, setIsPageAppendMenuOpen] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureModalMode, setSignatureModalMode] = useState("signature");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [signatureRequestModalOpen, setSignatureRequestModalOpen] = useState(false);
  const [protectModalOpen, setProtectModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [authRequiredAction, setAuthRequiredAction] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isManagePagesOpen, setIsManagePagesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activeSignature, setActiveSignature] = useState({ content: "", imageDataUrl: "", fontFamily: DEFAULT_SIGNATURE_FONT });
  const [pendingImage, setPendingImage] = useState(null);
  const [toolSettings, setToolSettings] = useState({
    textColor: colors.black,
    textSize: 16,
    fontFamily: "Arial",
    textAlign: "left",
    lineHeight: 1.25,
    textBold: false,
    textItalic: false,
    textUnderline: false,
    drawColor: colors.blue,
    drawStroke: 4,
    highlightColor: colors.yellow,
    highlightOpacity: 0.62,
    shapeColor: colors.blue,
    shapeStroke: 3,
    whiteoutOpacity: 1,
  });

  const selected = useMemo(() => annotations.find((annotation) => annotation.id === selectedId), [annotations, selectedId]);
  const selectedDetectedText = useMemo(() => detectedTextItems.find((item) => item.id === selectedDetectedTextId), [detectedTextItems, selectedDetectedTextId]);
  const activeDocument = useMemo(() => documents.find((document) => document.id === activeDocumentId), [documents, activeDocumentId]);
  const currentPage = pages[pageIndex] || pages[0];
  const hasVisibleToolSettings = selected?.type === "text" || ["text", "field", "draw", "highlight", "textHighlight", "whiteout", "rectangle", "circle", "line", "arrow"].includes(tool);
  const pageAnnotations = annotations.filter((annotation) => annotation.page === pageIndex);
  const pageDetectedTextItems = detectedTextItems.filter((item) => item.pageNumber === pageIndex && !item.isDeleted);
  const pageDeletedTextItems = detectedTextItems.filter((item) => item.pageNumber === pageIndex && item.isDeleted);
  const detectedTextCount = useMemo(() => detectedTextItems.filter((item) => !item.isDeleted).length, [detectedTextItems]);
  const contextualToolConfig = useMemo(() => {
    const tools = new Set(getToolsForMode(activeToolMode));
    return toolConfig.filter((item) => tools.has(item.id));
  }, [activeToolMode]);
  const zoomOptions = useMemo(() => (
    Array.from(new Set([...ZOOM_PRESETS, zoom])).sort((a, b) => a - b)
  ), [zoom]);
  const searchResults = useMemo(() => {
    const query = documentSearchQuery.trim().toLowerCase();
    if (!query) return [];

    const excerpt = (value) => {
      const clean = String(value || "").replace(/\s+/g, " ").trim();
      const index = clean.toLowerCase().indexOf(query);
      if (index < 0) return clean.slice(0, 120);
      const start = Math.max(0, index - 42);
      const end = Math.min(clean.length, index + query.length + 72);
      return `${start > 0 ? "..." : ""}${clean.slice(start, end)}${end < clean.length ? "..." : ""}`;
    };

    const pageMatches = pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => page.text?.toLowerCase().includes(query))
      .map(({ page, index }) => ({
        id: `page-${page.id}`,
        type: "Page text",
        page: index,
        title: `Page ${index + 1}`,
        excerpt: excerpt(page.text),
      }));

    const annotationMatches = annotations
      .filter((annotation) => String(annotation.content || "").toLowerCase().includes(query))
      .map((annotation) => ({
        id: annotation.id,
        type: annotation.type === "comment" ? "Comment" : annotation.type === "signature" ? "Signature" : "Annotation",
        page: annotation.page,
        annotationId: annotation.id,
        title: `Page ${annotation.page + 1}`,
        excerpt: excerpt(annotation.content),
      }));
    const detectedTextMatches = detectedTextItems
      .filter((item) => !item.isDeleted && String(item.currentText || "").toLowerCase().includes(query))
      .map((item) => ({
        id: item.id,
        type: item.source === "ocr" ? "OCR text" : "PDF text",
        page: item.pageNumber,
        detectedTextId: item.id,
        title: `Page ${item.pageNumber + 1}`,
        excerpt: excerpt(item.currentText),
      }));

    const fileMatch = fileName.toLowerCase().includes(query)
      ? [{ id: "file-name", type: "Document", page: 0, title: fileName, excerpt: `Document name: ${fileName}` }]
      : [];

    return [...fileMatch, ...pageMatches, ...annotationMatches, ...detectedTextMatches].sort((a, b) => a.page - b.page);
  }, [annotations, detectedTextItems, documentSearchQuery, fileName, pages]);
  const commentResults = useMemo(() => (
    annotations
      .filter((annotation) => annotation.type === "comment")
      .map((annotation) => ({
        id: annotation.id,
        page: annotation.page,
        content: annotation.content || "Add a comment",
        author: annotation.author || "You",
        updatedAt: annotation.updatedAt,
        replies: annotation.replies || [],
        status: annotation.status || "open",
        assignee: annotation.assignee || "Unassigned",
        history: annotation.history || [],
      }))
      .sort((a, b) => a.page - b.page)
  ), [annotations]);
  const saveStatusLabel = useMemo(() => {
    if (saveState === "error") return "Save error";
    if (saveState === "unsaved") return "Unsaved changes";
    if (saveState === "saving") return "Saving...";
    if (isOffline) return lastSavedAt ? "Saved offline" : "Offline";
    if (cloudSyncStatus === "syncing") return "Syncing to cloud...";
    if (cloudSyncStatus === "error") return "Saved locally";
    if (!currentUser?.uid && lastSavedAt) return "Saved in this browser";
    if (currentUser?.uid && cloudSyncStatus === "synced") return "Saved to cloud";
    return lastSavedAt ? `Saved ${formatDateTime(lastSavedAt)}` : "Saved";
  }, [cloudSyncStatus, currentUser?.uid, isOffline, lastSavedAt, saveState]);

  useEffect(() => {
    setActiveToolMode((currentMode) => resolveModeForTool(tool, currentMode));
  }, [tool]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDocumentCatalogReady(false);
    loadLocalDocuments(storageOwnerId)
      .then((localDocuments) => {
        if (!cancelled) setDocuments(localDocuments.length ? localDocuments : safeLoadDocuments(storageOwnerId));
      })
      .catch(() => {
        if (!cancelled) setDocuments(safeLoadDocuments(storageOwnerId));
      })
      .finally(() => {
        if (!cancelled && (isPublicEditor || !currentUser?.uid || !isCloudPersistenceConfigured)) setDocumentCatalogReady(true);
      });
    return () => { cancelled = true; };
  }, [currentUser?.uid, isPublicEditor, storageOwnerId]);

  useEffect(() => {
    if (view !== "public-editor" || !documentId || !documentCatalogReady || !currentUser?.uid) return undefined;
    if (documents.some((documentRecord) => documentRecord.id === documentId)) return undefined;
    const recoveryKey = `${currentUser.uid}:${documentId}`;
    if (publicDocumentRecoveryRef.current.has(recoveryKey)) return undefined;
    publicDocumentRecoveryRef.current.add(recoveryKey);
    let cancelled = false;

    const recoverDocument = async () => {
      const localDocuments = await loadLocalDocuments(currentUser.uid).catch(() => safeLoadDocuments(currentUser.uid));
      let candidate = localDocuments.find((documentRecord) => documentRecord.id === documentId);
      if (!candidate && isCloudPersistenceConfigured) {
        const cloudDocuments = await loadCloudDocumentRecords(currentUser.uid).catch(() => []);
        candidate = cloudDocuments.find((documentRecord) => documentRecord.id === documentId);
      }
      const recoveredDocument = recoverDocumentAsGuest(candidate);
      if (!recoveredDocument || cancelled) return;
      const guestDocuments = await loadLocalDocuments(GUEST_OWNER_ID).catch(() => documents);
      const nextDocuments = [recoveredDocument, ...guestDocuments.filter((documentRecord) => documentRecord.id !== documentId)];
      await saveLocalDocuments(GUEST_OWNER_ID, nextDocuments);
      if (!cancelled) {
        setDocuments(nextDocuments);
        setEditorRouteState("loading");
      }
    };

    recoverDocument().catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.uid, documentCatalogReady, documentId, documents, view]);

  useEffect(() => {
    if (isPublicEditor || !currentUser?.uid) {
      setCloudSyncStatus(isCloudPersistenceConfigured ? "idle" : "local");
      setDocumentCatalogReady(true);
      return undefined;
    }

    if (!isCloudPersistenceConfigured) {
      setCloudSyncStatus("local");
      setDocumentCatalogReady(true);
      return undefined;
    }

    let cancelled = false;
    setDocumentCatalogReady(false);
    setCloudSyncStatus("syncing");
    loadCloudDocumentRecords(currentUser.uid)
      .then(async (cloudDocuments) => {
        if (cancelled) return;
        const localDocuments = await loadLocalDocuments(currentUser.uid).catch(() => safeLoadDocuments(currentUser.uid));
        const mergedDocuments = mergeDocumentsByUpdatedAt(localDocuments, cloudDocuments);
        if (mergedDocuments.length) {
          await saveLocalDocuments(currentUser.uid, mergedDocuments);
          setDocuments(mergedDocuments);
          if (cloudDocuments.length) {
            showToast(`Loaded ${cloudDocuments.length} cloud document${cloudDocuments.length === 1 ? "" : "s"}.`);
          }
          if (localDocuments.length) {
            syncDocumentsToCloud([], mergedDocuments);
          }
        }
        if (!localDocuments.length) setCloudSyncStatus("synced");
        setDocumentCatalogReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCloudSyncStatus("error");
        setDocumentCatalogReady(true);
        showToast("Cloud sync is unavailable. Changes are saved locally.");
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, isPublicEditor]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const syncDocumentsToCloud = (previousDocuments, nextDocuments) => {
    if (!currentUser?.uid || !isCloudPersistenceConfigured) {
      setCloudSyncStatus(currentUser?.uid ? "local" : "idle");
      return;
    }

    const nextIds = new Set(nextDocuments.map((documentRecord) => documentRecord.id));
    const deletedDocuments = previousDocuments.filter((documentRecord) => documentRecord.id && !nextIds.has(documentRecord.id));
    setCloudSyncStatus("syncing");

    Promise.all([
      ...nextDocuments.map((documentRecord) => uploadDocumentRecordToCloud(currentUser.uid, documentRecord)),
      ...deletedDocuments.map((documentRecord) => deleteDocumentRecordFromCloud(currentUser.uid, documentRecord.id)),
    ])
      .then(() => setCloudSyncStatus("synced"))
      .catch(() => {
        setCloudSyncStatus("error");
        showToast("Saved locally. Cloud sync needs Firebase Storage and Firestore permissions.");
      });
  };

  const replaceDocuments = async (nextDocuments) => {
    const previousDocuments = documents;
    setDocuments(nextDocuments);
    try {
      await saveLocalDocuments(storageOwnerId, nextDocuments);
      if (currentUser?.uid && !isPublicEditor) syncDocumentsToCloud(previousDocuments, nextDocuments);
      return true;
    } catch {
      setSaveState("error");
      setUploadError("This browser could not preserve the working copy. Keep this tab open and try again.");
      return false;
    }
  };

  const openAuth = (mode = "signup", state = undefined) => {
    navigate(mode === "login" ? ROUTE_PATHS.login : ROUTE_PATHS.signup, { state });
  };

  const finishAuthenticatedNavigation = useCallback(async (user) => {
    if (!user?.uid || authHandoffStartedRef.current) return;
    authHandoffStartedRef.current = true;
    const requested = location.state?.from;
    const guestDocumentId = location.state?.guestDocumentId;
    const intent = location.state?.intent;
    const fallbackEditorPath = guestDocumentId
      ? publicEditorDocumentPath(location.state?.publicTool, guestDocumentId)
      : ROUTE_PATHS.dashboard;

    try {
      const claimedDocument = guestDocumentId ? await claimGuestDocument(user.uid, guestDocumentId, {
        loadDocuments: async (ownerId) => {
          const localDocuments = await loadLocalDocuments(ownerId);
          return localDocuments.length ? localDocuments : safeLoadDocuments(ownerId);
        },
      }) : null;
      let cloudSaveStatus = "local";
      if (claimedDocument && ["save", "share"].includes(intent) && isCloudPersistenceConfigured) {
        try {
          await uploadDocumentRecordToCloud(user.uid, claimedDocument);
          cloudSaveStatus = "synced";
        } catch {
          cloudSaveStatus = "error";
        }
      }
      const returnTo = claimedDocument
        ? editorPath(claimedDocument.id)
        : guestDocumentId
          ? fallbackEditorPath
        : requested?.pathname?.startsWith("/")
        ? `${requested.pathname}${requested.search || ""}${requested.hash || ""}`
        : ROUTE_PATHS.dashboard;
      navigate(returnTo, {
        replace: true,
        state: claimedDocument ? { publicTool: location.state?.publicTool, postAuthAction: intent, cloudSaveStatus } : undefined,
      });
    } catch {
      navigate(fallbackEditorPath, { replace: true, state: { publicTool: location.state?.publicTool } });
    }
  }, [location.state, navigate]);

  const completeAuth = async ({ email, password, name, provider }) => {
    const result = await authenticate({ mode: authMode, email, password, name, provider });
    if (result?.ok) {
      await finishAuthenticatedNavigation(result.user);
    }
    return result;
  };

  useEffect(() => {
    if (view !== "auth" || !currentUser?.uid || !location.state?.guestDocumentId) return;
    finishAuthenticatedNavigation(currentUser);
  }, [currentUser, finishAuthenticatedNavigation, location.state?.guestDocumentId, view]);

  const sendAuthPasswordReset = (email) => resetPassword(email);

  const logout = async () => {
    await logoutAuth();
    setPages([]);
    navigate(ROUTE_PATHS.home);
    showToast("Signed out.");
  };

  const upsertDocument = async (document) => {
    const persistedDocuments = await loadLocalDocuments(storageOwnerId).catch(() => documents);
    const nextDocuments = [document, ...persistedDocuments.filter((item) => item.id !== document.id)];
    return replaceDocuments(nextDocuments);
  };

  const markUnsaved = () => {
    setSaved(false);
    setSaveState("unsaved");
  };

  const saveActiveDocument = async (immediate = false) => {
    if (!activeDocumentId) return false;
    const stamp = nowIso();
    setSaveState(immediate ? "saved" : "saving");
    const nextDocuments = documents.map((document) => (
      document.id === activeDocumentId
        ? {
          ...document,
          name: fileName,
          pages,
          annotations,
          detectedTextItems,
          pageCount: pages.length,
          updatedAt: stamp,
        }
        : document
    ));
    const persisted = await replaceDocuments(nextDocuments);
    if (!persisted) return false;
    setLastSavedAt(stamp);
    setSaved(true);
    window.setTimeout(() => setSaveState("saved"), immediate ? 0 : 180);
    return true;
  };

  const persistEditorSession = async (pendingAction = "") => {
    if (!activeDocumentId) return false;
    return saveEditorSession(activeDocumentId, {
      fileName,
      sourceFile: sourceFileRef.current,
      pageIndex,
      zoom,
      tool,
      undoStack,
      redoStack,
      selectedId,
      selectedDetectedTextId,
      toolSettings,
      activeSignature,
      pendingImage,
      saved,
      saveState,
      lastSavedAt,
      pendingAction,
      publicTool,
      updatedAt: nowIso(),
    });
  };

  const duplicateActiveDocument = () => {
    if (!pages.length) return;
    const stamp = nowIso();
    const nextName = fileName.toLowerCase().endsWith(".pdf")
      ? fileName.replace(/\.pdf$/i, " copy.pdf")
      : `${fileName} copy.pdf`;
    const clonedPages = pages.map((page, index) => ({
      ...page,
      id: makeId(page.source === "pdf" ? "page" : "blank-page"),
      number: index + 1,
    }));
    const clonedAnnotations = annotations.map((annotation) => ({
      ...annotation,
      id: makeId(annotation.type || "annotation"),
    }));
    const clonedDetectedTextItems = detectedTextItems.map((item) => ({
      ...item,
      id: makeId("detected-text"),
    }));
    const duplicateRecord = {
      ...(activeDocument || {}),
      id: makeId("doc"),
      name: nextName,
      size: activeDocument?.size || 0,
      source: activeDocument?.source || (pdfBytes ? "pdf" : "blank"),
      pageCount: clonedPages.length,
      uploadedAt: stamp,
      updatedAt: stamp,
      pdfDataUrl: activeDocument?.pdfDataUrl || "",
      pages: clonedPages,
      annotations: clonedAnnotations,
      detectedTextItems: clonedDetectedTextItems,
    };

    upsertDocument(duplicateRecord);
    setActiveDocumentId(duplicateRecord.id);
    setFileName(nextName);
    setPages(clonedPages);
    setAnnotations(clonedAnnotations);
    setDetectedTextItems(clonedDetectedTextItems);
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    setUndoStack([]);
    setRedoStack([]);
    setPageIndex(0);
    setSaved(true);
    setSaveState("saved");
    setLastSavedAt(stamp);
    showToast("Document duplicated.");
  };

  const getHistorySnapshot = () => ({
    pages,
    annotations,
    detectedTextItems,
    pageIndex,
  });

  const pushHistorySnapshot = () => {
    setUndoStack((stack) => [...stack.slice(-24), getHistorySnapshot()]);
    setRedoStack([]);
  };

  const restoreHistorySnapshot = (snapshot) => {
    if (Array.isArray(snapshot)) {
      setAnnotations(snapshot);
      return;
    }
    setPages((snapshot.pages || []).map((page, index) => ({ ...page, number: index + 1 })));
    setAnnotations(snapshot.annotations || []);
    setDetectedTextItems(snapshot.detectedTextItems || []);
    setPageIndex(clamp(snapshot.pageIndex || 0, 0, Math.max(0, (snapshot.pages || []).length - 1)));
  };

  const commitAnnotations = (next) => {
    pushHistorySnapshot();
    setRedoStack([]);
    setAnnotations(next);
    markUnsaved();
  };

  const commitDetectedTextItems = (next) => {
    pushHistorySnapshot();
    setRedoStack([]);
    setDetectedTextItems(next);
    markUnsaved();
  };

  const updateAnnotation = (id, patch) => {
    const current = annotations.find((item) => item.id === id);
    if (!current) return;
    const changed = Object.entries(patch).some(([key, value]) => current[key] !== value);
    if (!changed) return;
    commitAnnotations(annotations.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateDetectedTextItem = (id, patch) => {
    setDetectedTextItems((items) => items.map((item) => (
      item.id === id
        ? {
          ...item,
          ...patch,
          isEdited: patch.isEdited ?? true,
          updatedAt: nowIso(),
        }
        : item
    )));
    markUnsaved();
  };

  const deleteDetectedTextItem = (id) => {
    commitDetectedTextItems(detectedTextItems.map((item) => (
      item.id === id ? { ...item, isDeleted: true, isEdited: true, updatedAt: nowIso() } : item
    )));
    setSelectedDetectedTextId(null);
    showToast("Original PDF text deleted.");
  };

  const duplicateDetectedTextItem = (item) => {
    if (!item) return;
    const duplicate = {
      ...item,
      id: makeId("detected-text"),
      x: clamp(item.x + 0.02, 0, 0.92),
      y: clamp(item.y + 0.02, 0, 0.94),
      originalText: item.currentText,
      isEdited: true,
      source: item.source,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    commitDetectedTextItems([...detectedTextItems, duplicate]);
    setSelectedDetectedTextId(duplicate.id);
    setSelectedId(null);
  };

  const addAnnotation = (annotation) => {
    const retainedAnnotations = annotations.filter((item) => (
      item.type !== "text" || !shouldDiscardTextAnnotation(item.content)
    ));
    commitAnnotations([...retainedAnnotations, annotation]);
    setSelectedId(annotation.id);
    setTool("select");
  };

  const goToSearchResult = (result, index = activeSearchIndex) => {
    if (!result) return;
    setActiveSearchIndex(index);
    setPageIndex(clamp(result.page, 0, Math.max(0, pages.length - 1)));
    setSelectedId(result.annotationId || null);
    setSelectedDetectedTextId(result.detectedTextId || null);
    if (result.annotationId || result.detectedTextId) {
      setIsInspectorCollapsed(false);
    }
    setTool(result.detectedTextId ? "editText" : "select");
  };

  const goToComment = (comment) => {
    if (!comment) return;
    setPageIndex(clamp(comment.page, 0, Math.max(0, pages.length - 1)));
    setSelectedId(comment.id);
    setIsInspectorCollapsed(false);
    setTool("select");
  };

  const addTextAnnotation = (content, point) => {
    const stamp = nowIso();
    addAnnotation(createTextAnnotation({ id: makeId("text"), page: pageIndex, point, content, settings: toolSettings, createdAt: stamp }));
  };

  useEffect(() => {
    if (!pages.length) return undefined;

    const onPaste = (event) => {
      const target = event.target;
      if (isEditableTarget(target)) return;

      const pastedText = event.clipboardData?.getData("text/plain");
      if (!pastedText?.trim()) return;

      event.preventDefault();
      addTextAnnotation(pastedText, lastPagePointRef.current);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [annotations, pageIndex, pages.length, toolSettings]);

  useEffect(() => {
    if (!activeDocumentId || !pages.length || saveState !== "unsaved") return undefined;
    const timer = window.setTimeout(() => saveActiveDocument(false), 900);
    return () => window.clearTimeout(timer);
  }, [annotations, detectedTextItems, fileName, pages, activeDocumentId, saveState]);

  useEffect(() => {
    if (!activeDocumentId || !pages.length) return undefined;
    const timer = window.setTimeout(() => {
      saveEditorSession(activeDocumentId, {
        fileName,
        sourceFile: sourceFileRef.current,
        pageIndex,
        zoom,
        tool,
        undoStack,
        redoStack,
        selectedId,
        selectedDetectedTextId,
        toolSettings,
        activeSignature,
        pendingImage,
        saved,
        saveState,
        lastSavedAt,
        pendingAction: "",
        publicTool,
        updatedAt: nowIso(),
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeDocumentId, activeSignature, fileName, lastSavedAt, pageIndex, pages.length, pendingImage, publicTool, redoStack, saveState, saved, selectedDetectedTextId, selectedId, tool, toolSettings, undoStack, zoom]);

  useEffect(() => {
    if (!pages.length || saveState !== "unsaved") return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [pages.length, saveState]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [documentSearchQuery]);

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!moreMenuRef.current?.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMoreMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isZoomMenuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!zoomMenuRef.current?.contains(event.target)) {
        setIsZoomMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsZoomMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomMenuOpen]);

  const selectPdfFile = () => {
    fileInputRef.current?.click();
  };

  const requireAuthenticationForEditorAction = async (intent) => {
    if (!editorActionNeedsAccount(intent, currentUser)) return true;
    const persisted = await saveActiveDocument(true);
    if (!persisted) {
      showToast("The guest draft could not be preserved. Keep this tab open and try again.");
      return false;
    }
    await persistEditorSession(intent);
    setAuthRequiredAction(intent);
    return false;
  };

  const continueAuthAction = async () => {
    const intent = authRequiredAction || "save";
    await persistEditorSession(intent);
    setAuthRequiredAction("");
    openAuth("login", {
      from: { pathname: location.pathname, search: location.search },
      intent,
      guestDocumentId: activeDocumentId,
      publicTool,
      notice: intent === "share"
        ? "Sign in to save this document before creating a persistent sharing link."
        : "Your document is safe in this browser. Sign in to save it to your FixThatPDF account.",
    });
  };

  const dismissAuthAction = () => {
    setAuthRequiredAction("");
    showToast("Your document is still available in this browser.");
  };

  const saveDocumentToAccount = async () => {
    if (!(await requireAuthenticationForEditorAction("save"))) return false;
    if (!(await saveActiveDocument(true))) return false;
    if (isPublicEditor && activeDocumentId) {
      const claimedDocument = await claimGuestDocument(currentUser.uid, activeDocumentId, {
        loadDocuments: async (ownerId) => {
          const localDocuments = await loadLocalDocuments(ownerId);
          return localDocuments.length ? localDocuments : safeLoadDocuments(ownerId);
        },
      });
      if (!claimedDocument) {
        showToast("The guest draft could not be moved to your workspace. Keep this tab open and try again.");
        return false;
      }
      navigate(editorPath(claimedDocument.id), { state: { publicTool, postAuthAction: "save" } });
      return true;
    }
    showToast("Saved to your FixThatPDF workspace.");
    return true;
  };

  const openShareSettings = async () => {
    if (!(await requireAuthenticationForEditorAction("share"))) return;
    setShareModalOpen(true);
  };

  const handleLandingDropFiles = (files) => {
    onUpload({ target: { files, value: "" } });
  };

  const parsePdfFile = async (file, { startPercent = 18, endPercent = 80, stagePrefix = "Rendering page" } = {}) => {
    const buffer = await file.arrayBuffer();
    const document = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    const loadedPages = [];
    const detectedItems = [];
    const detectedFormFields = [];

    for (let index = 1; index <= document.numPages; index += 1) {
      setUploadStage({
        status: `${stagePrefix} ${index} of ${document.numPages}`,
        percent: Math.round(startPercent + (index / document.numPages) * (endPercent - startPercent)),
        fileName: file.name,
      });
      const page = await document.getPage(index);
      const textContent = await page.getTextContent();
      const pdfAnnotations = await page.getAnnotations({ intent: "display" });
      const pageText = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
      const textViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      const displayWidth = BASE_PAGE_WIDTH;
      const displayHeight = Math.round(BASE_PAGE_WIDTH * (viewport.height / viewport.width));
      const pageRecord = {
        id: makeId("page"),
        number: index,
        originalIndex: index - 1,
        width: displayWidth,
        height: displayHeight,
        image: canvas.toDataURL("image/png"),
        text: pageText,
        source: "pdf",
      };
      detectedItems.push(...extractDetectedTextItems(textContent, textViewport, pageRecord, index - 1));
      detectedFormFields.push(...extractPdfFormAnnotations(pdfAnnotations, textViewport, index - 1, makeId));
      loadedPages.push({
        ...pageRecord,
        hasDetectedText: pageText.length > 0,
      });
    }

    return { buffer, loadedPages, detectedItems, detectedFormFields };
  };

  const loadPdfFile = async (file) => {
    if (!file) return;
    setUploadStage({ status: "validating", percent: 8, fileName: file.name });
    const validationError = validatePdfUpload(file);
    if (validationError) {
      setUploadError(validationError);
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
      return;
    }

    try {
      setUploadError("");
      sourceFileRef.current = file;
      setUploadStage({ status: "reading", percent: 18, fileName: file.name });
      const { buffer, loadedPages, detectedItems, detectedFormFields } = await parsePdfFile(file, {
        startPercent: 24,
        endPercent: 80,
        stagePrefix: "Rendering page",
      });

      setUploadStage({ status: "Saving workspace copy", percent: 88, fileName: file.name });
      const stamp = nowIso();
      const documentRecord = {
        id: makeId("doc"),
        ownerId: storageOwnerId,
        name: file.name,
        size: file.size,
        source: "pdf",
        pageCount: loadedPages.length,
        status: "Ready",
        location: "My documents",
        uploadedAt: stamp,
        updatedAt: stamp,
        pdfDataUrl: await arrayBufferToDataUrl(buffer.slice(0)),
        pages: loadedPages,
        annotations: detectedFormFields,
        detectedTextItems: detectedItems,
      };

      const persisted = await upsertDocument(documentRecord);
      if (!persisted) throw new Error("The working copy could not be stored.");
      setActiveDocumentId(documentRecord.id);
      setPages(loadedPages);
      setPdfBytes(buffer);
      setFileName(file.name);
      setPageIndex(0);
      setAnnotations(detectedFormFields);
      setDetectedTextItems(detectedItems);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedId(null);
      setSelectedDetectedTextId(null);
      setTool(resolveEditorActiveTool(publicTool, detectedItems.length));
      setSaved(true);
      setSaveState("saved");
      setLastSavedAt(stamp);
      setUploadStage({ status: "complete", percent: 100, fileName: file.name });
      showToast(detectedFormFields.length
        ? `Found ${detectedFormFields.length} fillable field${detectedFormFields.length === 1 ? "" : "s"}.`
        : detectedItems.length
          ? `Smart Edit detected ${detectedItems.length} text item${detectedItems.length === 1 ? "" : "s"}.`
          : "This looks scanned. OCR is not enabled in this browser build yet.");
      navigate(isPublicEditor ? publicEditorDocumentPath(publicTool, documentRecord.id) : editorPath(documentRecord.id), { state: { publicTool } });
      window.setTimeout(() => setUploadStage({ status: "idle", percent: 0, fileName: "" }), 900);
    } catch (error) {
      setUploadError(getPdfLoadErrorMessage(error));
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
    }
  };

  const onUpload = async (event) => {
    await loadPdfFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const mergeAndAppendPdfFile = async (file) => {
    if (!file) return;
    setIsPageAppendMenuOpen(false);
    setUploadStage({ status: "validating", percent: 8, fileName: file.name });
    const validationError = validatePdfUpload(file);
    if (validationError) {
      setUploadError(validationError);
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
      return;
    }

    try {
      setUploadError("");
      setUploadStage({ status: "reading append file", percent: 18, fileName: file.name });
      const { loadedPages, detectedItems, detectedFormFields } = await parsePdfFile(file, {
        startPercent: 24,
        endPercent: 82,
        stagePrefix: "Rendering append page",
      });
      const pageOffset = pages.length;
      const appendedPages = loadedPages.map((page, index) => ({
        ...page,
        id: makeId("page"),
        number: pageOffset + index + 1,
        originalIndex: null,
        source: "image",
      }));
      const appendedDetectedItems = detectedItems.map((item) => ({
        ...item,
        id: makeId("detected-text"),
        pageNumber: item.pageNumber + pageOffset,
      }));
      const appendedFormFields = detectedFormFields.map((item) => ({
        ...item,
        id: makeId("form-field"),
        page: item.page + pageOffset,
      }));

      pushHistorySnapshot();
      setPages((items) => [...items, ...appendedPages].map((page, index) => ({ ...page, number: index + 1 })));
      setDetectedTextItems((items) => [...items, ...appendedDetectedItems]);
      setAnnotations((items) => [...items, ...appendedFormFields]);
      setPageIndex(pageOffset);
      setSelectedId(null);
      setSelectedDetectedTextId(null);
      setIsPagesCollapsed(false);
      setTool(appendedDetectedItems.length ? "editText" : "select");
      markUnsaved();
      setUploadStage({ status: "complete", percent: 100, fileName: file.name });
      showToast(`Appended ${appendedPages.length} page${appendedPages.length === 1 ? "" : "s"} from ${file.name}.`);
      window.setTimeout(() => setUploadStage({ status: "idle", percent: 0, fileName: "" }), 900);
    } catch {
      setUploadError("We could not append that PDF. Try a smaller or unprotected PDF file.");
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
    }
  };

  const onAppendUpload = async (event) => {
    await mergeAndAppendPdfFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const loadImageForPlacement = async (file) => {
    if (!file) return;
    const isSupportedImage = file.type === "image/png"
      || file.type === "image/jpeg"
      || file.name.toLowerCase().endsWith(".png")
      || file.name.toLowerCase().endsWith(".jpg")
      || file.name.toLowerCase().endsWith(".jpeg");
    if (!isSupportedImage) {
      showToast("Use a PNG or JPG image so it can export into the PDF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast(`Images must be under ${formatBytes(MAX_IMAGE_BYTES)} for this browser workspace.`);
      return;
    }

    try {
      const image = await readImageFile(file);
      setPendingImage(image);
      setTool("image");
      showToast("Image ready. Click the PDF page to place it.");
    } catch {
      showToast("Could not read that image. Try another PNG or JPG.");
    }
  };

  const onImageUpload = async (event) => {
    await loadImageForPlacement(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDropFile = async (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    await loadPdfFile(event.dataTransfer.files?.[0]);
  };

  const startBlankDocument = async () => {
    const stamp = nowIso();
    const blankPages = [{ id: makeId("blank-page"), number: 1, originalIndex: null, width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT, source: "blank" }];
    const documentRecord = {
      id: makeId("doc"),
      ownerId: storageOwnerId,
      name: "Untitled blank document.pdf",
      size: 0,
      source: "blank",
      pageCount: 1,
      status: "Draft",
      location: "My documents",
      uploadedAt: stamp,
      updatedAt: stamp,
      pdfDataUrl: "",
      pages: blankPages,
      annotations: [],
      detectedTextItems: [],
    };

    const wasPersisted = await upsertDocument(documentRecord);
    if (!wasPersisted) return;
    setActiveDocumentId(documentRecord.id);
    setPages(blankPages);
    setPdfBytes(null);
    setFileName("Untitled blank document.pdf");
    setPageIndex(0);
    setAnnotations([]);
    setDetectedTextItems([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    setTool("text");
    setSaved(true);
    setSaveState("saved");
    setLastSavedAt(stamp);
    navigate(isPublicEditor ? publicEditorDocumentPath(publicTool, documentRecord.id) : editorPath(documentRecord.id), { state: { publicTool } });
  };

  const addBlankPage = () => {
    const insertionIndex = pageIndex + 1;
    const blankPage = {
      id: makeId("blank-page"),
      number: insertionIndex + 1,
      originalIndex: null,
      width: currentPage?.width || BASE_PAGE_WIDTH,
      height: currentPage?.height || BASE_PAGE_HEIGHT,
      source: "blank",
    };
    pushHistorySnapshot();
    setPages((items) => [...items.slice(0, insertionIndex), blankPage, ...items.slice(insertionIndex)].map((page, index) => ({ ...page, number: index + 1 })));
    setAnnotations((items) => items.map((annotation) => (annotation.page >= insertionIndex ? { ...annotation, page: annotation.page + 1 } : annotation)));
    setDetectedTextItems((items) => items.map((item) => (item.pageNumber >= insertionIndex ? { ...item, pageNumber: item.pageNumber + 1 } : item)));
    setPageIndex(insertionIndex);
    setIsPageAppendMenuOpen(false);
    markUnsaved();
    showToast("Blank page added.");
  };

  const duplicatePageAt = (targetIndex) => {
    const next = duplicateEditorPageState({
      pages,
      annotations,
      detectedTextItems,
      pageIndex: targetIndex,
      makeId,
    });
    if (next.pages === pages) return;
    pushHistorySnapshot();
    setPages(next.pages);
    setAnnotations(next.annotations);
    setDetectedTextItems(next.detectedTextItems);
    setPageIndex(next.pageIndex);
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    markUnsaved();
    showToast(`Page ${targetIndex + 1} duplicated.`);
  };

  const duplicateCurrentPage = () => duplicatePageAt(pageIndex);

  const deletePageAt = (targetIndex) => {
    if (pages.length <= 1) {
      showToast("A document needs at least one page.");
      return;
    }
    const removedIndex = clamp(targetIndex, 0, pages.length - 1);
    pushHistorySnapshot();
    setPages((items) => items.filter((_, index) => index !== removedIndex).map((page, index) => ({ ...page, number: index + 1 })));
    setAnnotations((items) => items
      .filter((annotation) => annotation.page !== removedIndex)
      .map((annotation) => (annotation.page > removedIndex ? { ...annotation, page: annotation.page - 1 } : annotation)));
    setDetectedTextItems((items) => items
      .filter((item) => item.pageNumber !== removedIndex)
      .map((item) => (item.pageNumber > removedIndex ? { ...item, pageNumber: item.pageNumber - 1 } : item)));
    setSelectedId(null);
    setPageIndex((value) => clamp(value > removedIndex ? value - 1 : value, 0, pages.length - 2));
    markUnsaved();
    showToast("Page deleted.");
  };

  const deleteCurrentPage = () => deletePageAt(pageIndex);

  const rotatePageAt = (targetIndex) => {
    const page = pages[targetIndex];
    if (!page) return;

    const commitRotation = (nextImage = page.image || "") => {
      pushHistorySnapshot();
      setPages((items) => items.map((item, index) => (
        index === targetIndex ? rotateEditorPageRecord(item, nextImage) : item
      )));
      setPageIndex(targetIndex);
      setSelectedId(null);
      setSelectedDetectedTextId(null);
      markUnsaved();
      showToast(`Page ${targetIndex + 1} rotated clockwise.`);
    };

    if (!page.image) {
      commitRotation();
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalHeight;
      canvas.height = image.naturalWidth;
      const context = canvas.getContext("2d");
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
      context.drawImage(image, 0, 0);
      commitRotation(canvas.toDataURL("image/png"));
    };
    image.onerror = () => showToast("This page could not be rotated.");
    image.src = page.image;
  };

  const rotateCurrentPage = () => rotatePageAt(pageIndex);

  const reorderPage = (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
    const remapIndex = (index) => {
      if (index === fromIndex) return toIndex;
      if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
      if (toIndex < fromIndex && index >= toIndex && index < fromIndex) return index + 1;
      return index;
    };
    pushHistorySnapshot();
    setPages((items) => {
      const next = [...items];
      const [movedPage] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedPage);
      return next.map((page, index) => ({ ...page, number: index + 1 }));
    });
    setAnnotations((items) => items.map((annotation) => ({ ...annotation, page: remapIndex(annotation.page) })));
    setDetectedTextItems((items) => items.map((item) => ({ ...item, pageNumber: remapIndex(item.pageNumber) })));
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    setPageIndex(toIndex);
    markUnsaved();
    showToast(`Moved page ${fromIndex + 1} to position ${toIndex + 1}.`);
  };

  const moveCurrentPage = (direction) => {
    reorderPage(pageIndex, pageIndex + direction);
  };

  const hydrateDocument = useCallback(async (documentRecord) => {
    const session = await loadEditorSession(documentRecord.id);
    const documentPages = (documentRecord.pages || []).map((page, index) => ({
      ...page,
      number: index + 1,
      originalIndex: page.source === "pdf" && page.originalIndex == null ? index : page.originalIndex,
    }));
    const sourceBytes = documentRecord.pdfDataUrl ? await dataUrlToArrayBuffer(documentRecord.pdfDataUrl) : null;
    setActiveDocumentId(documentRecord.id);
    setPages(documentPages);
    setAnnotations(documentRecord.annotations || []);
    setDetectedTextItems(documentRecord.detectedTextItems || []);
    setPdfBytes(sourceBytes);
    setFileName(session?.fileName || documentRecord.name);
    setPageIndex(clamp(session?.pageIndex || 0, 0, Math.max(0, documentPages.length - 1)));
    setUndoStack(session?.undoStack || []);
    setRedoStack(session?.redoStack || []);
    setSelectedId(session?.selectedId || null);
    setSelectedDetectedTextId(session?.selectedDetectedTextId || null);
    setTool(session?.tool || "select");
    setZoom(session?.zoom || 100);
    if (session?.toolSettings) {
      setToolSettings((settings) => ({
        ...settings,
        ...session.toolSettings,
        fontFamily: session.toolSettings.fontFamily === "PP Agrandir" ? "Arial" : session.toolSettings.fontFamily || settings.fontFamily,
      }));
    }
    if (session?.activeSignature) setActiveSignature(session.activeSignature);
    setPendingImage(session?.pendingImage || null);
    setSaved(session?.saved ?? true);
    setSaveState(session?.saveState || "saved");
    setLastSavedAt(session?.lastSavedAt || documentRecord.updatedAt);
    if (session?.sourceFile) {
      sourceFileRef.current = session.sourceFile;
    } else if (sourceBytes && typeof File !== "undefined") {
      sourceFileRef.current = new File([sourceBytes], documentRecord.name, { type: "application/pdf" });
    }
    setEditorRouteState("ready");
  }, []);

  const openDocument = async (documentRecord) => {
    if (documentRecord.ownerId && documentRecord.ownerId !== currentUser?.uid) {
      setEditorRouteState("unauthorized");
      navigate(editorPath(documentRecord.id));
      return;
    }
    setEditorRouteState("loading");
    await hydrateDocument(documentRecord);
    navigate(editorPath(documentRecord.id));
  };

  const renameActiveDocument = () => {
    const nextName = window.prompt("Rename document", fileName);
    if (!nextName?.trim()) return;
    const stamp = nowIso();
    setFileName(nextName.trim());
    replaceDocuments(documents.map((item) => (
      item.id === activeDocumentId ? { ...item, name: nextName.trim(), updatedAt: stamp } : item
    )));
    setLastSavedAt(stamp);
    markUnsaved();
  };

  const renameDocument = (documentRecord) => {
    const nextName = window.prompt("Rename document", documentRecord.name);
    if (!nextName?.trim()) return;
    const stamp = nowIso();
    replaceDocuments(documents.map((item) => (
      item.id === documentRecord.id ? { ...item, name: nextName.trim(), updatedAt: stamp } : item
    )));
    if (activeDocumentId === documentRecord.id) {
      setFileName(nextName.trim());
      setLastSavedAt(stamp);
    }
  };

  const deleteDocument = (documentRecord) => {
    if (!window.confirm(`Delete "${documentRecord.name}" from this browser?`)) return;
    clearEditorSession(documentRecord.id);
    replaceDocuments(documents.filter((item) => item.id !== documentRecord.id));
    if (activeDocumentId === documentRecord.id) {
      setActiveDocumentId(null);
      setPages([]);
      setAnnotations([]);
      setPdfBytes(null);
      navigate(ROUTE_PATHS.documents);
    }
  };

  const toggleDocumentFavorite = (documentRecord) => {
    const stamp = nowIso();
    replaceDocuments(documents.map((item) => (
      item.id === documentRecord.id ? { ...item, favorite: !item.favorite, updatedAt: stamp } : item
    )));
    showToast(documentRecord.favorite ? "Removed from favorites." : "Added to favorites.");
  };

  const duplicateDocument = (documentRecord) => {
    const stamp = nowIso();
    const copyName = documentRecord.name.replace(/(\.pdf)?$/i, " copy.pdf");
    const duplicatedDocument = {
      ...documentRecord,
      id: makeId("doc-copy"),
      name: copyName,
      favorite: false,
      uploadedAt: stamp,
      updatedAt: stamp,
      pages: (documentRecord.pages || []).map((page) => ({ ...page, id: makeId("page") })),
      annotations: (documentRecord.annotations || []).map((annotation) => ({ ...annotation, id: makeId("annotation") })),
      detectedTextItems: (documentRecord.detectedTextItems || []).map((item) => ({ ...item, id: makeId("detected-text") })),
    };
    replaceDocuments([duplicatedDocument, ...documents]);
    showToast("Document copied.");
  };

  const moveDocument = (documentRecord) => {
    const currentLocation = documentRecord.location || "My documents";
    const nextLocation = window.prompt("Move to folder", currentLocation);
    if (!nextLocation?.trim()) return;
    const stamp = nowIso();
    replaceDocuments(documents.map((item) => (
      item.id === documentRecord.id ? { ...item, location: nextLocation.trim(), updatedAt: stamp } : item
    )));
    showToast(`Moved to ${nextLocation.trim()}.`);
  };

  const downloadStoredDocument = async (documentRecord) => {
    if (documentRecord.pdfDataUrl) {
      const buffer = await dataUrlToArrayBuffer(documentRecord.pdfDataUrl);
      downloadBlob(new Blob([buffer], { type: "application/pdf" }), documentRecord.name);
      return;
    }

    const blankPdf = await createBlankPdf(documentRecord.pageCount || 1);
    const bytes = await blankPdf.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), documentRecord.name);
  };

  const onPagePointerDown = (event) => {
    event.currentTarget.focus({ preventScroll: true });
    lastPagePointRef.current = pointerToNormalized(event, event.currentTarget);
    if (!["text", "highlight", "textHighlight", "draw", "signature", "initials", "checkbox", "field", "date", "whiteout", "rectangle", "circle", "line", "arrow", "comment", "stamp", "link", "image"].includes(tool)) {
      const selectedAnnotation = annotations.find((item) => item.id === selectedId);
      if (selectedAnnotation?.type === "text" && shouldDiscardTextAnnotation(selectedAnnotation.content)) {
        commitAnnotations(annotations.filter((item) => item.id !== selectedAnnotation.id));
      }
      setSelectedId(null);
      setSelectedDetectedTextId(null);
      return;
    }
    setSelectedDetectedTextId(null);
    const point = lastPagePointRef.current;

    if (tool === "image") {
      if (!pendingImage) {
        imageInputRef.current?.click();
        showToast("Choose a PNG or JPG, then click the page to place it.");
        return;
      }
      const aspectRatio = pendingImage.height / Math.max(1, pendingImage.width);
      const pageAspectCorrection = (currentPage?.width || BASE_PAGE_WIDTH) / (currentPage?.height || BASE_PAGE_HEIGHT);
      const width = 0.24;
      const height = clamp(width * aspectRatio * pageAspectCorrection, 0.05, 0.32);
      addAnnotation({
        id: makeId("image"),
        type: "image",
        page: pageIndex,
        x: clamp(point.x, 0, 0.98 - width),
        y: clamp(point.y, 0, 0.98 - height),
        w: width,
        h: height,
        content: pendingImage.name || "Inserted image",
        imageDataUrl: pendingImage.dataUrl,
        opacity: 1,
      });
      setPendingImage(null);
      return;
    }

    if (["draw", "highlight", "whiteout", "rectangle", "circle", "line", "arrow"].includes(tool)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (tool === "text") {
      addTextAnnotation("", point);
      return;
    }

    if (tool === "textHighlight") {
      addAnnotation({
        id: makeId("text-highlight"),
        type: "highlight",
        page: pageIndex,
        x: clamp(point.x, 0, 0.82),
        y: clamp(point.y, 0, 0.96),
        w: 0.16,
        h: 0.024,
        color: toolSettings.highlightColor,
        opacity: toolSettings.highlightOpacity,
        rotation: 0,
      });
      return;
    }

    if (tool === "date") {
      addTextAnnotation(new Intl.DateTimeFormat("en", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date()), point);
      return;
    }

    if (tool === "field") {
      addAnnotation({
        id: makeId("field"),
        type: "field",
        page: pageIndex,
        x: clamp(point.x, 0, 0.68),
        y: clamp(point.y, 0, 0.93),
        w: 0.28,
        h: 0.055,
        content: "",
        fieldName: "Text field",
        color: colors.blue,
        fontSize: 12,
        opacity: 1,
      });
      return;
    }

    if (tool === "signature") {
      if (!activeSignature.content && !activeSignature.imageDataUrl) {
        setSignatureModalMode("signature");
        setSignatureModalOpen(true);
        return;
      }
      addAnnotation({
        id: makeId("signature"),
        type: "signature",
        page: pageIndex,
        x: clamp(point.x, 0, 0.74),
        y: clamp(point.y, 0, 0.94),
        w: 0.26,
        h: activeSignature.imageDataUrl ? 0.09 : 0.055,
        content: activeSignature.content || signatureText || "Signature",
        imageDataUrl: activeSignature.imageDataUrl,
        color: "#0f172a",
        fontSize: 27,
        fontFamily: activeSignature.fontFamily || DEFAULT_SIGNATURE_FONT,
        opacity: 1,
      });
      return;
    }

    if (tool === "initials") {
      if (!signatureText.trim()) {
        setSignatureModalMode("initials");
        setSignatureModalOpen(true);
        showToast("Enter your name, then click the page to place your initials.");
        return;
      }
      addAnnotation({
        id: makeId("initials"),
        type: "initials",
        page: pageIndex,
        x: clamp(point.x, 0, 0.86),
        y: clamp(point.y, 0, 0.94),
        w: 0.12,
        h: 0.055,
        content: signatureText.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(),
        color: "#0f172a",
        fontSize: 24,
        opacity: 1,
      });
      return;
    }

    if (tool === "comment") {
      const createdAt = nowIso();
      addAnnotation({
        id: makeId("comment"),
        type: "comment",
        page: pageIndex,
        x: clamp(point.x, 0, 0.94),
        y: clamp(point.y, 0, 0.94),
        w: 0.048,
        h: 0.048,
        content: "Add a comment",
        author: "You",
        createdAt,
        updatedAt: createdAt,
        status: "open",
        assignee: "Unassigned",
        replies: [],
        history: [{ type: "created", author: "You", at: createdAt }],
        color: "#f59e0b",
        opacity: 1,
      });
      return;
    }

    if (tool === "stamp") {
      addAnnotation({
        id: makeId("stamp"),
        type: "stamp",
        page: pageIndex,
        x: clamp(point.x, 0, 0.76),
        y: clamp(point.y, 0, 0.91),
        w: 0.22,
        h: 0.075,
        content: "APPROVED",
        color: colors.blue,
        opacity: 1,
        rotation: -8,
      });
      return;
    }

    if (tool === "link") {
      const url = window.prompt("Link address", "https://");
      if (!url?.trim()) return;
      const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      addAnnotation({
        id: makeId("link"),
        type: "link",
        page: pageIndex,
        x: clamp(point.x, 0, 0.7),
        y: clamp(point.y, 0, 0.93),
        w: 0.28,
        h: 0.045,
        content: normalizedUrl.replace(/^https?:\/\//i, ""),
        url: normalizedUrl,
        color: colors.blue,
        fontSize: 12,
        opacity: 1,
        rotation: 0,
      });
      return;
    }

    if (tool === "checkbox") {
      addAnnotation({
        id: makeId("checkbox"),
        type: "checkbox",
        page: pageIndex,
        x: clamp(point.x, 0, 0.95),
        y: clamp(point.y, 0, 0.95),
        w: 0.035,
        h: 0.035,
        checked: true,
        color: colors.blue,
        opacity: 1,
      });
      return;
    }

    const id = makeId(tool);
    setDraft({
      id,
      type: tool,
      page: pageIndex,
      start: point,
      ...(tool === "draw"
        ? { color: toolSettings.drawColor, strokeWidth: toolSettings.drawStroke, opacity: 1, points: [point] }
        : {
          x: point.x,
          y: point.y,
          w: 0.01,
          h: 0.01,
          color: tool === "whiteout" ? "#ffffff" : tool === "highlight" ? toolSettings.highlightColor : toolSettings.shapeColor,
          strokeWidth: toolSettings.shapeStroke,
          opacity: tool === "whiteout" ? toolSettings.whiteoutOpacity : toolSettings.highlightOpacity,
        }),
    });
  };

  const onPagePointerMove = (event) => {
    lastPagePointRef.current = pointerToNormalized(event, event.currentTarget);
    if (!draft) return;
    const point = lastPagePointRef.current;

    if (draft.type === "draw") {
      setDraft((current) => ({ ...current, points: [...current.points, point] }));
      return;
    }

    const x = Math.min(draft.start.x, point.x);
    const y = Math.min(draft.start.y, point.y);
    setDraft((current) => ({
      ...current,
      x,
      y,
      w: Math.abs(point.x - draft.start.x),
      h: Math.abs(point.y - draft.start.y),
    }));
  };

  const onPagePointerUp = () => {
    if (!draft) return;
    const finalized = draft.type === "draw"
      ? { id: draft.id, type: "draw", page: pageIndex, points: draft.points, color: draft.color, strokeWidth: draft.strokeWidth, opacity: draft.opacity }
      : {
        id: draft.id,
        type: draft.type,
        page: pageIndex,
        x: draft.x,
        y: draft.y,
        w: Math.max(draft.w, draft.type === "line" || draft.type === "arrow" ? 0.08 : 0.035),
        h: Math.max(draft.h, draft.type === "line" || draft.type === "arrow" ? 0.025 : 0.018),
        color: draft.color,
        strokeWidth: draft.strokeWidth,
        opacity: draft.type === "rectangle" || draft.type === "circle" || draft.type === "line" || draft.type === "arrow" ? 1 : draft.opacity,
      };
    commitAnnotations([...annotations, finalized]);
    setDraft(null);
    setSelectedId(finalized.id);
    setTool(finalized.type === "draw" ? "draw" : "select");
  };

  const undo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [getHistorySnapshot(), ...stack].slice(0, 25));
    setUndoStack((stack) => stack.slice(0, -1));
    restoreHistorySnapshot(previous);
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    markUnsaved();
  };

  const redo = () => {
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    setUndoStack((stack) => [...stack, getHistorySnapshot()].slice(-25));
    setRedoStack(rest);
    restoreHistorySnapshot(next);
    setSelectedId(null);
    setSelectedDetectedTextId(null);
    markUnsaved();
  };

  const duplicateSelected = () => {
    if (selectedDetectedText) {
      duplicateDetectedTextItem(selectedDetectedText);
      return;
    }
    if (!selected || selected.type === "draw") return;
    addAnnotation({ ...selected, id: makeId(selected.type), x: clamp(selected.x + 0.025, 0, 0.86), y: clamp(selected.y + 0.025, 0, 0.94) });
  };

  const copySelected = () => {
    if (selectedDetectedText) {
      editorClipboardRef.current = { kind: "detected-text", value: { ...selectedDetectedText } };
      showToast("Text copied.");
      return true;
    }
    if (!selected) return false;
    editorClipboardRef.current = {
      kind: "annotation",
      value: {
        ...selected,
        points: selected.points?.map((point) => ({ ...point })),
      },
    };
    showToast("Object copied.");
    return true;
  };

  const pasteCopied = () => {
    const copied = editorClipboardRef.current;
    if (!copied) {
      showToast("Copy an editor object first.");
      return;
    }
    if (copied.kind === "detected-text") {
      duplicateDetectedTextItem(copied.value);
      showToast("Text pasted.");
      return;
    }
    const value = copied.value;
    const pasted = value.type === "draw"
      ? {
        ...value,
        id: makeId("draw"),
        page: pageIndex,
        points: (value.points || []).map((point) => ({ x: clamp(point.x + 0.025, 0, 1), y: clamp(point.y + 0.025, 0, 1) })),
      }
      : {
        ...value,
        id: makeId(value.type),
        page: pageIndex,
        x: clamp((value.x || 0) + 0.025, 0, Math.max(0, 1 - (value.w || 0.1))),
        y: clamp((value.y || 0) + 0.025, 0, Math.max(0, 1 - (value.h || 0.05))),
      };
    addAnnotation(pasted);
    editorClipboardRef.current = { kind: "annotation", value: pasted };
    showToast("Object pasted.");
  };

  const deleteSelected = () => {
    if (selectedDetectedTextId) {
      deleteDetectedTextItem(selectedDetectedTextId);
      return;
    }
    if (!selected) return;
    commitAnnotations(annotations.filter((annotation) => annotation.id !== selected.id));
    setSelectedId(null);
  };

  const bringSelectedToFront = () => {
    if (!selected) return;
    commitAnnotations([...annotations.filter((annotation) => annotation.id !== selected.id), selected]);
    setSelectedId(selected.id);
    showToast("Moved to front.");
  };

  const sendSelectedToBack = () => {
    if (!selected) return;
    commitAnnotations([selected, ...annotations.filter((annotation) => annotation.id !== selected.id)]);
    setSelectedId(selected.id);
    showToast("Moved to back.");
  };

  const alignSelectedCenter = () => {
    if (!selected || selected.type === "draw") {
      showToast("Freehand drawings cannot be aligned yet.");
      return;
    }
    updateAnnotation(selected.id, { x: clamp((1 - (selected.w || 0.1)) / 2, 0, 0.95), y: clamp(selected.y, 0, 0.96) });
    showToast("Aligned to page center.");
  };

  const addCustomSelectedColor = (value) => {
    if (!selected) return;
    const nextColor = normalizeHexColor(value);
    if (!nextColor) {
      showToast("Enter a 6-digit hex color, like #1e63f0.");
      return false;
    }
    updateAnnotation(selected.id, { color: nextColor });
    showToast("Custom color applied.");
    return true;
  };

  const fitPageToWidth = () => {
    const availableWidth = (canvasColumnRef.current?.clientWidth || 0) - 96;
    if (!currentPage?.width || availableWidth <= 0) {
      setZoom(100);
      return;
    }
    const nextZoom = Math.round((availableWidth / (currentPage.width * EDITOR_PAGE_SCALE)) * 100);
    setZoom(clamp(nextZoom, 60, 160));
    showToast("Fit page to width.");
  };

  const updateDetectedTextContent = (id, element) => {
    const pageRect = element.closest(".page-surface")?.getBoundingClientRect();
    const text = element.innerText;
    const patch = { currentText: text || " ", isEdited: true };
    if (pageRect?.width && pageRect?.height) {
      patch.w = clamp((element.scrollWidth + 18) / pageRect.width, 0.02, 0.92);
      patch.h = clamp((element.scrollHeight + 10) / pageRect.height, 0.018, 0.32);
    }
    updateDetectedTextItem(id, patch);
  };

  const startDetectedTextDrag = (event, item) => {
    if (tool === "erase") {
      event.preventDefault();
      event.stopPropagation();
      deleteDetectedTextItem(item.id);
      return;
    }
    if (tool === "textHighlight") {
      event.preventDefault();
      event.stopPropagation();
      addAnnotation({
        id: makeId("text-highlight"),
        type: "highlight",
        page: item.pageNumber,
        x: clamp(item.x - 0.003, 0, 0.99),
        y: clamp(item.y + item.h * 0.08, 0, 0.99),
        w: clamp(item.w + 0.006, 0.02, 1 - item.x),
        h: clamp(item.h * 0.78, 0.012, 0.12),
        color: toolSettings.highlightColor,
        opacity: toolSettings.highlightOpacity,
        rotation: item.rotation || 0,
      });
      showToast("Text highlighted.");
      return;
    }
    if (isEditableTarget(event.target) || event.target.closest?.(".detected-text-toolbar, .resize-handle")) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const pageRect = event.currentTarget.closest(".page-surface").getBoundingClientRect();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: item.x, y: item.y };
    pushHistorySnapshot();
    setSelectedDetectedTextId(item.id);
    setSelectedId(null);
    setTool("editText");
    const move = (moveEvent) => {
      setDetectedTextItems((items) => items.map((candidate) => (
        candidate.id === item.id
          ? {
            ...candidate,
            x: clamp(origin.x + (moveEvent.clientX - origin.clientX) / pageRect.width, 0, 0.98 - candidate.w),
            y: clamp(origin.y + (moveEvent.clientY - origin.clientY) / pageRect.height, 0, 0.98 - candidate.h),
            isEdited: true,
            updatedAt: nowIso(),
          }
          : candidate
      )));
      markUnsaved();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startDetectedTextResize = (event, item) => {
    event.stopPropagation();
    const pageRect = event.currentTarget.closest(".page-surface").getBoundingClientRect();
    const origin = { clientX: event.clientX, clientY: event.clientY, w: item.w, h: item.h };
    pushHistorySnapshot();
    const move = (moveEvent) => {
      setDetectedTextItems((items) => items.map((candidate) => (
        candidate.id === item.id
          ? {
            ...candidate,
            w: clamp(origin.w + (moveEvent.clientX - origin.clientX) / pageRect.width, 0.02, 0.92),
            h: clamp(origin.h + (moveEvent.clientY - origin.clientY) / pageRect.height, 0.018, 0.32),
            isEdited: true,
            updatedAt: nowIso(),
          }
          : candidate
      )));
      markUnsaved();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    if (!selectedDetectedTextId || tool !== "editText") return;
    const wrapper = Array.from(document.querySelectorAll("[data-detected-text-id]"))
      .find((element) => element.dataset.detectedTextId === selectedDetectedTextId);
    const editable = wrapper?.querySelector(".detected-text-content");
    if (!editable || document.activeElement === editable) return;

    requestAnimationFrame(() => {
      editable.focus({ preventScroll: true });
      const selection = window.getSelection?.();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }, [selectedDetectedTextId, tool]);

  useEffect(() => {
    if (!pages.length) return undefined;

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        saveDocumentToAccount();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "f") {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (isEditableTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && key === "c") {
        if (selectedId || selectedDetectedTextId) {
          event.preventDefault();
          copySelected();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "x") {
        if (selectedId || selectedDetectedTextId) {
          event.preventDefault();
          if (copySelected()) deleteSelected();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "v") {
        event.preventDefault();
        pasteCopied();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && (selected || selectedDetectedText)) {
        event.preventDefault();
        const amount = event.shiftKey ? 0.012 : 0.002;
        if (selected) {
          const originFrame = getAnnotationFrame(selected);
          const nextFrame = nudgeFrame(originFrame, event.key, amount);
          updateAnnotation(selected.id, annotationPatchFromFrame(selected, nextFrame, originFrame));
        } else if (selectedDetectedText) {
          const nextFrame = nudgeFrame(getAnnotationFrame({ ...selectedDetectedText, type: "text" }), event.key, amount);
          commitDetectedTextItems(detectedTextItems.map((item) => (
            item.id === selectedDetectedText.id
              ? { ...item, x: nextFrame.x, y: nextFrame.y, isEdited: true, updatedAt: nowIso() }
              : item
          )));
        }
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && selected?.type === "text" && key.length === 1) return;

      if (key === "escape") {
        setSelectedId(null);
        setSelectedDetectedTextId(null);
        setPendingImage(null);
        setTool("select");
      }
      if (key === "t") setTool("text");
      if (key === "i") imageInputRef.current?.click();
      if (key === "d") setTool("draw");
      if (key === "h") setTool("highlight");
      if (key === "s") setTool("signature");
      if (key === "f") setTool("field");
      if (key === "c") setTool("checkbox");
      if ((key === "backspace" || key === "delete") && (selectedId || selectedDetectedTextId)) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pages, pageIndex, selectedId, selectedDetectedTextId, selected, selectedDetectedText, annotations, detectedTextItems, undoStack, redoStack, saveState]);

  const exportPdf = async (options = {}) => {
    const shouldDownload = options?.download !== false;
    const shouldShowResult = options?.showResult !== false;
    setIsExporting(true);
    try {
    await saveActiveDocument(true);
    const pdfDoc = await PDFDocument.create();
    const sourcePdf = pdfBytes ? await PDFDocument.load(pdfBytes) : null;

    await appendEditorPages({ pdfDoc, sourcePdf, pages, embedDataUrlImage });

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const pickPdfFont = (fontFamily = "", isBold = false) => {
      const lowerFont = String(fontFamily).toLowerCase();
      if (isBold) return helveticaBold;
      if (lowerFont.includes("courier")) return courier;
      if (lowerFont.includes("times") || lowerFont.includes("georgia")) return timesRoman;
      return helvetica;
    };

    for (const item of detectedTextItems.filter((candidate) => candidate.isEdited || candidate.isDeleted)) {
      const page = pdfDoc.getPages()[item.pageNumber];
      if (!page) continue;
      const { width, height } = page.getSize();
      const pageRecord = pages[item.pageNumber] || {};
      const pdfScale = width / (pageRecord.width || BASE_PAGE_WIDTH);
      const x = item.x * width;
      const boxHeight = item.h * height;
      const y = height - item.y * height - boxHeight;
      const boxWidth = item.w * width;
      const fontSize = clamp((item.fontSize || 11) * pdfScale, 4, 54);
      const font = pickPdfFont(item.fontFamily);
      const color = hexToRgb(item.color || colors.black);

      page.drawRectangle({
        x: Math.max(0, x - 1.5),
        y: Math.max(0, y - 1.5),
        width: Math.min(width - x + 1.5, boxWidth + 3),
        height: Math.min(height - y + 1.5, boxHeight + 3),
        color: rgb(1, 1, 1),
        opacity: 1,
        borderOpacity: 0,
      });

      if (!item.isDeleted && String(item.currentText || "").trim()) {
        String(item.currentText || "").split("\n").forEach((line, index) => {
          page.drawText(line, {
            x: x + 1.5,
            y: y + Math.max(1, boxHeight - fontSize * 0.95) - index * fontSize * 1.18,
            size: fontSize,
            font,
            color,
            opacity: 1,
          });
        });
      }
    }

    for (const annotation of annotations) {
      const page = pdfDoc.getPages()[annotation.page];
      if (!page) continue;
      const { width, height } = page.getSize();
      const color = hexToRgb(annotation.color || colors.black);

      if (await drawFlattenedInputAnnotation({ pdfDoc, page, annotation, helvetica, timesItalic, pickPdfFont, embedDataUrlImage })) {
        continue;
      }

      if (annotation.type === "highlight") {
        page.drawRectangle({
          x: annotation.x * width,
          y: height - annotation.y * height - annotation.h * height,
          width: annotation.w * width,
          height: annotation.h * height,
          color,
          opacity: annotation.opacity,
          borderOpacity: 0,
          rotate: degrees(Number(annotation.rotation || 0)),
        });
      }

      if (annotation.type === "whiteout") {
        page.drawRectangle({
          x: annotation.x * width,
          y: height - annotation.y * height - annotation.h * height,
          width: annotation.w * width,
          height: annotation.h * height,
          color: rgb(1, 1, 1),
          opacity: annotation.opacity,
          borderOpacity: 0,
          rotate: degrees(Number(annotation.rotation || 0)),
        });
      }

      if (annotation.type === "rectangle") {
        page.drawRectangle({
          x: annotation.x * width,
          y: height - annotation.y * height - annotation.h * height,
          width: annotation.w * width,
          height: annotation.h * height,
          borderColor: color,
          borderWidth: annotation.strokeWidth || 2,
          opacity: annotation.opacity,
          rotate: degrees(Number(annotation.rotation || 0)),
        });
      }

      if (annotation.type === "circle") {
        page.drawEllipse({
          x: annotation.x * width + (annotation.w * width) / 2,
          y: height - annotation.y * height - (annotation.h * height) / 2,
          xScale: (annotation.w * width) / 2,
          yScale: (annotation.h * height) / 2,
          borderColor: color,
          borderWidth: annotation.strokeWidth || 2,
          opacity: annotation.opacity,
        });
      }

      if (annotation.type === "line" || annotation.type === "arrow") {
        const center = { x: (annotation.x + annotation.w / 2) * width, y: height - (annotation.y + annotation.h / 2) * height };
        const start = rotatePdfPoint({ x: annotation.x * width, y: height - annotation.y * height }, center, annotation.rotation);
        const end = rotatePdfPoint({ x: (annotation.x + annotation.w) * width, y: height - (annotation.y + annotation.h) * height }, center, annotation.rotation);
        page.drawLine({
          start,
          end,
          thickness: annotation.strokeWidth || 3,
          color,
          opacity: annotation.opacity,
        });
        if (annotation.type === "arrow") {
          const head = Math.max(10, (annotation.strokeWidth || 3) * 4);
          page.drawLine({ start: end, end: { x: end.x - head, y: end.y }, thickness: annotation.strokeWidth || 3, color, opacity: annotation.opacity });
          page.drawLine({ start: end, end: { x: end.x, y: end.y + head }, thickness: annotation.strokeWidth || 3, color, opacity: annotation.opacity });
        }
      }

      if (annotation.type === "stamp") {
        const stampX = annotation.x * width;
        const stampY = height - annotation.y * height - annotation.h * height;
        const stampWidth = annotation.w * width;
        const stampHeight = annotation.h * height;
        const annotationRotation = degrees(Number(annotation.rotation || 0));
        page.drawRectangle({
          x: stampX,
          y: stampY,
          width: stampWidth,
          height: stampHeight,
          borderColor: color,
          borderWidth: Math.max(1.5, stampHeight * 0.055),
          opacity: annotation.opacity,
          rotate: annotationRotation,
        });
        const stampText = String(annotation.content || "APPROVED").slice(0, 24);
        const stampSize = Math.max(8, Math.min(20, stampHeight * 0.42));
        page.drawText(stampText, {
          x: stampX + Math.max(4, stampWidth * 0.06),
          y: stampY + Math.max(3, (stampHeight - stampSize) / 2),
          size: stampSize,
          font: helveticaBold,
          color,
          opacity: annotation.opacity,
          rotate: annotationRotation,
        });
      }

      if (annotation.type === "link") {
        const linkX = annotation.x * width;
        const linkY = height - annotation.y * height - annotation.h * height;
        const linkWidth = annotation.w * width;
        const linkHeight = annotation.h * height;
        const linkSize = Math.max(7, Math.min(14, annotation.fontSize || linkHeight * 0.5));
        const linkText = String(annotation.content || annotation.url || "Link").slice(0, 80);
        page.drawText(linkText, {
          x: linkX + 2,
          y: linkY + Math.max(2, (linkHeight - linkSize) / 2),
          size: linkSize,
          font: helvetica,
          color,
          opacity: annotation.opacity,
        });
        page.drawLine({
          start: { x: linkX + 2, y: linkY + 1 },
          end: { x: linkX + linkWidth, y: linkY + 1 },
          thickness: 0.8,
          color,
          opacity: annotation.opacity,
        });
        addPdfLinkAnnotation(page, pdfDoc, {
          x: linkX,
          y: linkY,
          width: linkWidth,
          height: linkHeight,
          url: annotation.url,
        });
      }

      if (annotation.type === "comment") {
        const markerSize = Math.max(20, Math.min(annotation.w * width, annotation.h * height));
        const x = annotation.x * width;
        const y = height - annotation.y * height - markerSize;
        page.drawRectangle({
          x,
          y,
          width: markerSize,
          height: markerSize,
          color: rgb(1, 0.74, 0.25),
          borderColor: rgb(0.86, 0.48, 0.03),
          borderWidth: 1,
          opacity: annotation.opacity,
        });
        page.drawText("C", {
          x: x + markerSize * 0.32,
          y: y + markerSize * 0.28,
          size: markerSize * 0.46,
          font: helveticaBold,
          color: rgb(0.5, 0.25, 0.03),
        });
        attachPdfCommentAnnotation({ pdfDoc, page, annotation, x, y, size: markerSize });
      }

      if (annotation.type === "image" && annotation.imageDataUrl) {
        const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
        if (image) {
          page.drawImage(image, {
            x: annotation.x * width,
            y: height - annotation.y * height - annotation.h * height,
            width: annotation.w * width,
            height: annotation.h * height,
            opacity: annotation.opacity,
            rotate: degrees(Number(annotation.rotation || 0)),
          });
        }
      }

      if (annotation.type === "draw") {
        const frame = getAnnotationFrame(annotation);
        const center = { x: (frame.x + frame.w / 2) * width, y: height - (frame.y + frame.h / 2) * height };
        annotation.points.slice(1).forEach((point, index) => {
          const previous = annotation.points[index];
          page.drawLine({
            start: rotatePdfPoint({ x: previous.x * width, y: height - previous.y * height }, center, annotation.rotation),
            end: rotatePdfPoint({ x: point.x * width, y: height - point.y * height }, center, annotation.rotation),
            thickness: annotation.strokeWidth,
            color,
            opacity: annotation.opacity,
          });
        });
      }
    }

    const bytes = await pdfDoc.save();
    const exported = {
      bytes,
      blob: new Blob([bytes], { type: "application/pdf" }),
      name: fileName.replace(/\.pdf$/i, "") + "-edited.pdf",
    };
    if (shouldDownload) downloadBlob(exported.blob, exported.name);
    setSaved(true);
    setSaveState("saved");
    if (shouldShowResult) showToast("Exported PDF with current edits.");
    return exported;
    } catch {
      showToast("Export failed. Try saving locally, then export again.");
      return null;
    } finally {
    setIsExporting(false);
    }
  };

  const prepareSignatureRequest = async ({ recipient, message }) => {
    const exported = await exportPdf({ download: false, showResult: false });
    if (!exported) throw new Error("The signing copy could not be created.");
    const shareFile = new File([exported.blob], exported.name, { type: "application/pdf" });
    const shareData = {
      title: `Signature requested: ${fileName}`,
      text: message || `Please review and sign ${fileName}.`,
      files: [shareFile],
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      showToast("Signing copy handed off to your share app.");
    } else {
      downloadBlob(exported.blob, exported.name);
      const subject = encodeURIComponent(`Signature requested: ${fileName}`);
      const body = encodeURIComponent(`${message || `Please review and sign ${fileName}.`}\n\nThe signing copy was downloaded—attach it to this message before sending.`);
      window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`;
      showToast("Signing copy downloaded. Attach it to the email draft before sending.");
    }
    setSignatureRequestModalOpen(false);
  };

  const protectDocument = async (password) => {
    const exported = await exportPdf({ download: false, showResult: false });
    if (!exported) throw new Error("The PDF could not be prepared for protection.");
    const protectedBytes = await protectPdfBytes(exported.bytes, password);
    const protectedName = `${exported.name.replace(/\.pdf$/i, "")}-protected.pdf`;
    downloadBlob(new Blob([protectedBytes], { type: "application/pdf" }), protectedName);
    setProtectModalOpen(false);
    showToast("Protected PDF downloaded. Keep the password somewhere safe.");
  };

  useEffect(() => {
    if (view !== "editor" && view !== "public-editor") {
      setEditorRouteState("idle");
      return;
    }
    if (!documentId) {
      setEditorRouteState("not-found");
      return;
    }
    if (activeDocumentId === documentId && pages.length) {
      setEditorRouteState("ready");
      return;
    }

    const resolved = resolveEditorDocument({
      documentId,
      documents,
      userId: storageOwnerId,
      catalogReady: documentCatalogReady,
    });
    if (resolved.status !== "ready") {
      setEditorRouteState(resolved.status);
      return;
    }

    setEditorRouteState("loading");
    hydrateDocument(resolved.document).catch(() => setEditorRouteState("error"));
  }, [activeDocumentId, documentCatalogReady, documentId, documents, hydrateDocument, pages.length, storageOwnerId, view]);

  useEffect(() => {
    const requestedTool = location.state?.publicTool;
    const postAuthAction = location.state?.postAuthAction;
    if ((view !== "editor" && view !== "public-editor") || editorRouteState !== "ready") return;
    const preset = requestedTool ? getEditorToolPreset(requestedTool) : null;

    if (preset) {
      setTool(resolveEditorActiveTool(requestedTool, detectedTextCount));
      if (preset.openPages) setIsPagesCollapsed(false);
      if (preset.openAppend) setIsPageAppendMenuOpen(true);
      if (preset.openComments) {
        setIsCommentsOpen(true);
        setIsSearchOpen(false);
      }
      if (requestedTool === "sign-pdf" || requestedTool === "add-initials") {
        setSignatureModalMode(requestedTool === "add-initials" ? "initials" : "signature");
        setSignatureModalOpen(true);
      }
      if (requestedTool === "request-signatures") setSignatureRequestModalOpen(true);
      if (requestedTool === "protect-pdf") setProtectModalOpen(true);
    }

    if (postAuthAction === "save") {
      showToast(location.state?.cloudSaveStatus === "error"
        ? "Saved to your account. Cloud sync will retry when available."
        : "This document is now saved to your account.");
    } else if (postAuthAction === "share") {
      setShareModalOpen(true);
    } else if (preset) {
      showToast(`${preset.label} tools are ready.`);
    }

    if (preset || postAuthAction) navigate(currentLocationPath(location), { replace: true, state: null });
  }, [detectedTextCount, editorRouteState, location, navigate, view]);

  const activateReferenceTool = (nextTool) => {
    setIsShapeMenuOpen(false);
    setSelectedDetectedTextId(null);
    if (nextTool === "image") {
      setTool("image");
      imageInputRef.current?.click();
      return;
    }
    if (nextTool === "signature") {
      setTool("signature");
      if (!activeSignature.content && !activeSignature.imageDataUrl) {
        setSignatureModalMode("signature");
        setSignatureModalOpen(true);
      } else {
        showToast("Click the page to place your signature.");
      }
      return;
    }
    if (nextTool === "editText") {
      setTool("editText");
      showToast(detectedTextCount ? "Click existing PDF text to edit it." : "This page has no editable text layer. Use Add Text instead.");
      return;
    }
    if (nextTool === "textHighlight") {
      setTool("textHighlight");
      showToast(detectedTextCount ? "Click existing PDF text to highlight it." : "Click the page to place a text highlight.");
      return;
    }
    if (nextTool === "note") {
      setTool("comment");
      showToast("Click the page to place a note.");
      return;
    }
    if (nextTool === "erase") showToast("Click an annotation or existing text item to erase it.");
    if (nextTool === "stamp") showToast("Click the page to place an Approved stamp.");
    if (nextTool === "link") showToast("Click the page, then enter the link address.");
    setTool(nextTool);
  };

  const finishEditing = async () => {
    await saveActiveDocument(true);
    navigate(currentUser?.uid ? ROUTE_PATHS.documents : ROUTE_PATHS.home);
  };

  if (view === "landing") {
    return (
      <LatticePdfLanding
        fileInputRef={fileInputRef}
        onUpload={onUpload}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup")}
        onSelectFiles={selectPdfFile}
        onDropFiles={handleLandingDropFiles}
        onBlankPage={startBlankDocument}
        uploadError={uploadError}
        uploadStage={uploadStage}
        documentCount={documents.length}
      />
    );
  }

  if (view === "tool-upload") {
    return (
      <EditorToolUploadPage
        toolId={publicTool || "edit-pdf"}
        fileInputRef={fileInputRef}
        onUpload={onUpload}
        onDropFiles={handleLandingDropFiles}
        onBlankPage={startBlankDocument}
        uploadError={uploadError}
        uploadStage={uploadStage}
      />
    );
  }

  if (view === "auth") {
    const returnLocation = location.state?.from;
    const canReturnToEditor = returnLocation?.pathname === ROUTE_PATHS.editPdf
      || returnLocation?.pathname?.startsWith("/app/editor/");
    return (
      <AuthPage
        mode={authMode}
        setMode={(mode) => navigate(mode === "signup" ? ROUTE_PATHS.signup : mode === "forgot-password" ? ROUTE_PATHS.forgotPassword : ROUTE_PATHS.login, { state: location.state })}
        onBack={() => navigate(canReturnToEditor ? returnLocation : ROUTE_PATHS.home)}
        backLabel={canReturnToEditor ? "Back to document" : "Back to home"}
        onComplete={completeAuth}
        onPasswordReset={sendAuthPasswordReset}
        authReady={authReady}
        isFirebaseConfigured={isFirebaseConfigured}
        routeNotice={location.state?.notice}
      />
    );
  }

  if (view === "dashboard") {
    return (
      <UploadLanding
        section={appSection}
        onNavigate={navigate}
        fileInputRef={fileInputRef}
        onUpload={onUpload}
        onSelectFiles={selectPdfFile}
        onDropFile={onDropFile}
        onBlankPage={startBlankDocument}
        uploadError={uploadError}
        uploadStage={uploadStage}
        isDraggingFile={isDraggingFile}
        setIsDraggingFile={setIsDraggingFile}
        documents={documents}
        onOpenDocument={openDocument}
        onRenameDocument={renameDocument}
        onDeleteDocument={deleteDocument}
        onDuplicateDocument={duplicateDocument}
        onDownloadDocument={downloadStoredDocument}
        onToggleFavorite={toggleDocumentFavorite}
        onMoveDocument={moveDocument}
        currentUser={currentUser}
        onLogout={logout}
        onUpgrade={() => setUpgradeModalOpen(true)}
      />
    );
  }

  if ((view === "editor" || view === "public-editor") && (editorRouteState !== "ready" || !pages.length)) {
    return <EditorRouteStatePage state={editorRouteState} onBack={() => navigate(view === "public-editor" ? publicEditorPath(publicTool) : ROUTE_PATHS.documents)} backLabel={view === "public-editor" ? `Back to ${getEditorToolPreset(publicTool)?.label || "PDF tools"}` : "Back to documents"} onHome={view === "public-editor" ? () => navigate(ROUTE_PATHS.home) : undefined} />;
  }

  return (
    <main className={`editor-shell ${hasVisibleToolSettings ? "has-tool-settings" : ""} ${tool === "editText" ? "is-smart-text-mode" : ""} ${tool === "textHighlight" ? "is-text-highlight-mode" : ""} ${tool === "highlight" || tool === "textHighlight" ? "is-highlight-settings-mode" : ""}`}>
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <input ref={appendFileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onAppendUpload} />
      <input ref={imageInputRef} className="hidden-input" type="file" accept="image/png,image/jpeg" onChange={onImageUpload} />
      {isOffline && <div className="editor-offline-banner" role="status">You are offline. Editing and local saves still work in this browser.</div>}
      <header className="file-header reference-file-header">
        <div className="reference-brand-lockup">
          <EditorBrandButton onDashboard={() => navigate(ROUTE_PATHS.dashboard)} />
          <span className="reference-brand-divider" aria-hidden="true" />
          <button type="button" className="reference-document-name" onClick={renameActiveDocument} title={`Rename ${fileName}`}>
            <FileText size={19} aria-hidden="true" />
            <span>{fileName}</span>
          </button>
          <span className={`reference-save-state ${saveState === "unsaved" ? "is-unsaved" : ""}`}>
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{saveStatusLabel}</span>
          </span>
        </div>
        <div className="reference-header-actions" aria-label="Document actions">
          <button type="button" onClick={() => window.print()}><Printer size={23} /><span>Print</span></button>
          <button type="button" onClick={exportPdf} disabled={isExporting}><Download size={23} /><span>{isExporting ? "Preparing…" : "Download"}</span></button>
          <button type="button" className="reference-done-button" onClick={finishEditing}><span>Done</span></button>
        </div>
      </header>
      <header className="file-header">
        <button type="button" className="editor-home-button" onClick={() => navigate(ROUTE_PATHS.home)} title="Back to FixThatPDF home" aria-label="Back to FixThatPDF home"><Home size={21} /></button>
        <button
          type="button"
          className="pdfnet-brand"
          onClick={() => setIsPagesCollapsed((value) => !value)}
          title={isPagesCollapsed ? "Open thumbnails" : "Close thumbnails"}
          aria-label={isPagesCollapsed ? "Open thumbnails" : "Close thumbnails"}
          aria-controls="page-thumbnails"
          aria-expanded={!isPagesCollapsed}
        >
          <List size={27} aria-hidden="true" />
        </button>
        <div className="file-meta">
          <button type="button" className="file-name" onClick={renameActiveDocument} title="Rename document">{fileName}</button>
          <span className={`save-state ${saveState === "unsaved" ? "unsaved" : ""}`}><Info size={16} /> {saveStatusLabel}</span>
        </div>
        <div className="pdfnet-header-tools">
          <button type="button" className="icon-button" onClick={() => setIsSearchOpen((value) => !value)} title="Search"><Search size={22} /></button>
          <button type="button" className="icon-button" onClick={undo} disabled={!undoStack.length} title="Undo"><Undo2 size={21} /></button>
          <button type="button" className="icon-button" onClick={redo} disabled={!redoStack.length} title="Redo"><Redo2 size={21} /></button>
          <button className="toolbar-icon" type="button" onClick={() => setZoom((value) => clamp(value - 10, 60, 160))} title="Zoom out">-</button>
          <div className="zoom-menu-wrap" ref={zoomMenuRef}>
            <button
              className={`toolbar-chip ${isZoomMenuOpen ? "is-active" : ""}`}
              type="button"
              title="Zoom presets"
              aria-haspopup="menu"
              aria-expanded={isZoomMenuOpen}
              onClick={() => setIsZoomMenuOpen((value) => !value)}
            >
              {zoom}% <ChevronDown size={15} />
            </button>
            {isZoomMenuOpen && (
              <div className="zoom-preset-menu" role="menu" aria-label="Zoom presets">
                {zoomOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={zoom === value}
                    className={zoom === value ? "is-selected" : ""}
                    onClick={() => {
                      setZoom(value);
                      setIsZoomMenuOpen(false);
                    }}
                  >
                    <span>{value}%</span>
                    {value === 100 ? <small>Actual size</small> : value === 80 ? <small>Comfort view</small> : !ZOOM_PRESETS.includes(value) ? <small>Fit width</small> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="toolbar-icon" type="button" onClick={() => setZoom((value) => clamp(value + 10, 60, 160))} title="Zoom in">+</button>
        </div>
        <div className="header-actions">
          <div className="more-menu-wrap" ref={moreMenuRef}>
            <button
              type="button"
              className={`icon-button ${isMoreMenuOpen ? "is-active" : ""}`}
              title="More"
              aria-haspopup="menu"
              aria-expanded={isMoreMenuOpen}
              onClick={() => setIsMoreMenuOpen((value) => !value)}
            >
              <Grid2X2 size={20} />
            </button>
            {isMoreMenuOpen && (
              <div className="document-more-menu" role="menu" aria-label="Document actions">
                <button type="button" role="menuitem" onClick={() => {
                  setIsMoreMenuOpen(false);
                  navigate(ROUTE_PATHS.home);
                }}><Home size={16} /> Back to home</button>
                <button type="button" role="menuitem" onClick={() => {
                  setIsMoreMenuOpen(false);
                  saveDocumentToAccount();
                }}><LayoutDashboard size={16} /> Save to workspace</button>
                <button type="button" role="menuitem" onClick={() => {
                  renameActiveDocument();
                  setIsMoreMenuOpen(false);
                }}><PenLine size={16} /> Rename document</button>
                <button type="button" role="menuitem" onClick={() => {
                  duplicateActiveDocument();
                  setIsMoreMenuOpen(false);
                }}><FilePlus2 size={16} /> Duplicate document</button>
                <button type="button" role="menuitem" onClick={() => {
                  saveDocumentToAccount();
                  setIsMoreMenuOpen(false);
                }}><Save size={16} /> Save document</button>
                <span />
                <button type="button" role="menuitem" onClick={() => {
                  addBlankPage();
                  setIsMoreMenuOpen(false);
                }}><Plus size={16} /> Add blank page</button>
                <button type="button" role="menuitem" onClick={() => {
                  openShareSettings();
                  setIsMoreMenuOpen(false);
                }}><Share2 size={16} /> Share settings</button>
                <button type="button" role="menuitem" onClick={() => {
                  window.print();
                  setIsMoreMenuOpen(false);
                }}><Printer size={16} /> Print document</button>
                <button type="button" role="menuitem" onClick={() => {
                  exportPdf();
                  setIsMoreMenuOpen(false);
                }}><Download size={16} /> Export PDF</button>
              </div>
            )}
          </div>
          <button type="button" className="language-button" onClick={() => showToast("Language set to English.")}>◎ EN</button>
          <button type="button" className="share-button" onClick={openShareSettings} title="Share"><Share2 size={18} /> Share</button>
          <button type="button" className="upgrade-button editor-upgrade-button" onClick={() => setUpgradeModalOpen(true)}>Upgrade</button>
          <button type="button" className="sign-secure-button" onClick={() => { setSignatureModalMode("signature"); setSignatureModalOpen(true); }}><PenLine size={18} /> Sign securely <ChevronDown size={15} /></button>
        </div>
      </header>

      <section className="tool-ribbon reference-tool-ribbon" aria-label="PDF editing toolbar">
        <div className="reference-history-tools" aria-label="History">
          <button type="button" className="reference-toolbar-button" onClick={undo} disabled={!undoStack.length}><Undo2 size={23} /><span>Undo</span></button>
          <button type="button" className="reference-toolbar-button" onClick={redo} disabled={!redoStack.length}><Redo2 size={23} /><span>Redo</span></button>
        </div>

        <div className="reference-primary-tools" role="toolbar" aria-label="Editing tools">
          <div className="reference-content-tools">
            {referencePrimaryTools.slice(0, 3).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`reference-toolbar-button ${tool === id ? "is-active" : ""}`} aria-pressed={tool === id} onClick={() => activateReferenceTool(id)}>
                <Icon size={23} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="reference-markup-tools">
            <div className="reference-shape-tool">
              <button type="button" className={`reference-toolbar-button ${["arrow", "line", "rectangle", "circle"].includes(tool) ? "is-active" : ""}`} aria-pressed={["arrow", "line", "rectangle", "circle"].includes(tool)} onClick={() => activateReferenceTool("arrow")}>
                <Send size={23} /><span>Arrow</span>
              </button>
              <button type="button" className="reference-shape-menu-trigger" aria-label="More shape tools" aria-haspopup="menu" aria-expanded={isShapeMenuOpen} onClick={() => setIsShapeMenuOpen((value) => !value)}><ChevronDown size={14} /></button>
              {isShapeMenuOpen && (
                <div className="reference-shape-menu" role="menu" aria-label="Shape tools">
                  {[
                    { id: "arrow", label: "Arrow", icon: Send },
                    { id: "line", label: "Line", icon: Minus },
                    { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
                    { id: "circle", label: "Ellipse", icon: Circle },
                  ].map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="menuitem" onClick={() => activateReferenceTool(id)}><Icon size={18} /> {label}</button>
                  ))}
                </div>
              )}
            </div>
            {referencePrimaryTools.slice(3, 5).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`reference-toolbar-button ${tool === id ? "is-active" : ""}`} aria-pressed={tool === id} onClick={() => activateReferenceTool(id)}>
                <Icon size={23} /><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="reference-annotation-tools">
            {referencePrimaryTools.slice(5).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`reference-toolbar-button ${tool === id || (id === "note" && tool === "comment") ? "is-active" : ""}`} aria-pressed={tool === id || (id === "note" && tool === "comment")} onClick={() => activateReferenceTool(id)}>
                <Icon size={23} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="reference-secondary-tools">
          <button type="button" className={`reference-toolbar-button ${isSearchOpen ? "is-active" : ""}`} onClick={() => {
            setIsSearchOpen((value) => !value);
            setIsCommentsOpen(false);
          }}><Search size={23} /><span>Search</span></button>
          <button type="button" className={`reference-toolbar-button ${isManagePagesOpen ? "is-active" : ""}`} onClick={() => {
            setIsManagePagesOpen((value) => !value);
            setIsPagesCollapsed(false);
          }}><PanelsTopLeft size={23} /><span>Manage pages</span></button>
        </div>
      </section>

      <section className="tool-ribbon" aria-label={`${EDITOR_TOOL_MODES.find((mode) => mode.id === activeToolMode)?.label || "View"} tools`}>
        <div className="contextual-mode-label">{EDITOR_TOOL_MODES.find((mode) => mode.id === activeToolMode)?.label || "View"}</div>
        {contextualToolConfig.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            className={`ribbon-tool ${tool === id ? "is-active" : ""}`}
            onClick={() => {
              if (id === "signature" && !activeSignature.content && !activeSignature.imageDataUrl) {
                setSignatureModalMode("signature");
                setSignatureModalOpen(true);
              }
              if (id === "image") {
                imageInputRef.current?.click();
                showToast(pendingImage ? "Click the page to place the selected image." : "Choose a PNG or JPG to insert.");
              }
              if (id === "editText") {
                showToast(detectedTextCount ? `${detectedTextCount} original PDF text item${detectedTextCount === 1 ? "" : "s"} ready. Click a blue outline to edit.` : "Upload a text-based PDF to edit the original words.");
              }
              setTool(id);
              setActiveToolMode((currentMode) => resolveModeForTool(id, currentMode));
            }}
          >
            {id === "text" ? <span className="text-tool-glyph" aria-hidden="true">A</span> : <Icon size={25} />}
            <span>{label === "Text field" ? "Field" : label === "Signature" ? "Sign" : label === "Edit PDF Text" ? "Edit PDF" : label}</span>
          </button>
        ))}
        <div className={`smart-text-chip ${tool === "editText" ? "is-active" : ""}`}>
          <ScanText size={17} />
          {activeToolMode === "edit"
            ? detectedTextCount ? `${detectedTextCount} original text boxes detected` : "Add Text remains available for scanned PDFs"
            : `Active tool: ${toolConfig.find((item) => item.id === tool)?.label || "Select"}`}
        </div>
      </section>

      <ToolSettingsPanel
        tool={tool}
        settings={toolSettings}
        setSettings={setToolSettings}
        selectedTextAnnotation={selected?.type === "text" ? selected : null}
        updateAnnotation={updateAnnotation}
      />

      <section className={`workspace ${isPagesCollapsed ? "pages-collapsed" : ""} ${isManagePagesOpen ? "is-managing-pages" : ""}`}>
        <aside className="lumin-editor-rail">
          {EDITOR_TOOL_MODES.map((mode) => {
            const Icon = mode.id === "view" ? MousePointer2 : mode.id === "annotate" ? Highlighter : mode.id === "shapes" ? RectangleHorizontal : mode.id === "insert" ? Plus : mode.id === "edit" ? Type : PenLine;
            return (
            <button key={mode.id} type="button" className={activeToolMode === mode.id ? "is-active" : ""} aria-pressed={activeToolMode === mode.id} onClick={() => {
              setActiveToolMode(mode.id);
              setTool(getDefaultToolForMode(mode.id));
              setSelectedId(null);
              setSelectedDetectedTextId(null);
            }}>
              <Icon size={28} />
              <span>{mode.label}</span>
            </button>
          );})}
        </aside>
        <aside id="page-thumbnails" className={`pages-panel ${isPagesCollapsed ? "is-collapsed" : ""}`}>
          <div className="panel-title pdfnet-page-title">
            <strong>Thumbnails</strong>
            <div>
              <button type="button" title="Grid view" onClick={() => setViewMode("grid")}><Grid2X2 size={18} /></button>
              <button type="button" title="List view" onClick={() => setViewMode("list")}><List size={18} /></button>
              <button type="button" title="Close thumbnails" onClick={() => setIsPagesCollapsed(true)}><X size={18} /></button>
            </div>
          </div>
          {isManagePagesOpen && <div className="page-organizer-controls">
            <div className="page-organizer-heading">
              <div><strong>Manage pages</strong><span>Page {pageIndex + 1} of {pages.length}</span></div>
              <small>Drag thumbnails to reorder</small>
            </div>
            <div className="page-actions reference-page-actions">
            <button type="button" onClick={() => setIsPageAppendMenuOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isPageAppendMenuOpen}><FilePlus2 size={16} /> Insert</button>
            {isPageAppendMenuOpen && (
              <div className="page-append-menu" role="menu" aria-label="Append pages">
                <button type="button" role="menuitem" onClick={addBlankPage}>Insert blank page after current</button>
                <button type="button" role="menuitem" onClick={() => {
                  setIsPageAppendMenuOpen(false);
                  appendFileInputRef.current?.click();
                }}>Insert pages from another PDF</button>
              </div>
            )}
            <button type="button" onClick={duplicateCurrentPage}><Copy size={16} /> Duplicate</button>
            <button type="button" onClick={rotateCurrentPage}><RotateCw size={16} /> Rotate</button>
            <button type="button" onClick={deleteCurrentPage} disabled={pages.length <= 1}><Trash2 size={16} /> Delete</button>
            </div>
          </div>}
          <div className={`thumbnail-list ${viewMode}`}>
            {pages.map((page, index) => (
              <div key={page.id} className="page-thumbnail-item">
              <button
                type="button"
                className={`thumbnail ${pageIndex === index ? "is-selected" : ""} ${draggedPageIndex === index ? "is-dragging" : ""} ${pageDropIndex === index && draggedPageIndex !== index ? "is-drop-target" : ""}`}
                aria-current={pageIndex === index ? "page" : undefined}
                aria-label={`Page ${index + 1}. Use Alt+Arrow Up or Alt+Arrow Down to reorder.`}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                title={`Page ${index + 1}`}
                onClick={() => setPageIndex(index)}
                draggable={isManagePagesOpen}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  setDraggedPageIndex(index);
                  setPageDropIndex(index);
                }}
                onDragEnter={() => setPageDropIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
                  if (Number.isInteger(fromIndex)) reorderPage(fromIndex, index);
                  setDraggedPageIndex(null);
                  setPageDropIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedPageIndex(null);
                  setPageDropIndex(null);
                }}
                onKeyDown={(event) => {
                  if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                  event.preventDefault();
                  reorderPage(index, clamp(index + (event.key === "ArrowUp" ? -1 : 1), 0, pages.length - 1));
                }}
              >
                <div className="thumbnail-preview" style={{ "--thumbnail-aspect": `${page.width || BASE_PAGE_WIDTH} / ${page.height || BASE_PAGE_HEIGHT}` }}>
                  <div className="thumb-page">
                    {page.image ? <img src={page.image} alt={`Page ${index + 1}`} /> : page.source === "blank" ? <BlankDocument /> : <SampleDocument pageIndex={index} />}
                  </div>
                </div>
                <span className="thumbnail-label">{index + 1}</span>
              </button>
              {isManagePagesOpen && pageIndex === index && (
                <div className="thumbnail-inline-actions" aria-label={`Actions for page ${index + 1}`}>
                  <button type="button" title={`Move page ${index + 1} up`} aria-label={`Move page ${index + 1} up`} onClick={() => moveCurrentPage(-1)} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button type="button" title={`Move page ${index + 1} down`} aria-label={`Move page ${index + 1} down`} onClick={() => moveCurrentPage(1)} disabled={index === pages.length - 1}><ChevronDown size={14} /></button>
                  <button type="button" title={`Duplicate page ${index + 1}`} aria-label={`Duplicate page ${index + 1}`} onClick={() => duplicatePageAt(index)}><Copy size={14} /></button>
                  <button type="button" title={`Rotate page ${index + 1}`} aria-label={`Rotate page ${index + 1}`} onClick={() => rotatePageAt(index)}><RotateCw size={14} /></button>
                  <button type="button" title={`Delete page ${index + 1}`} aria-label={`Delete page ${index + 1}`} onClick={() => deletePageAt(index)} disabled={pages.length <= 1}><Trash2 size={14} /></button>
                </div>
              )}
              </div>
            ))}
          </div>
          {isManagePagesOpen && <div className="thumbnail-footer" aria-label="Page actions">
            <button type="button" title="Delete page" aria-label="Delete page" onClick={deleteCurrentPage} disabled={pages.length <= 1}>
              <Trash2 size={18} strokeWidth={2.6} />
            </button>
            <button type="button" title="Rotate page clockwise" aria-label="Rotate page clockwise" onClick={rotateCurrentPage}>
              <RotateCw size={20} strokeWidth={2.6} />
            </button>
            <button type="button" title="Add page" aria-label="Add page" onClick={addBlankPage}>
              <FilePlus2 size={20} strokeWidth={2.4} />
            </button>
            <button type="button" title="Download PDF" aria-label="Download PDF" onClick={exportPdf} disabled={isExporting}>
              <Download size={19} strokeWidth={2.5} />
            </button>
          </div>}
          <div className="saved-foot"><CheckCircle2 size={22} /> {saveStatusLabel}</div>
        </aside>

        <div className="canvas-column" ref={canvasColumnRef}>
          <div className="document-stage">
            <div
              className="page-surface"
              tabIndex={0}
              style={{ width: currentPage.width * (zoom / 100) * EDITOR_PAGE_SCALE, height: currentPage.height * (zoom / 100) * EDITOR_PAGE_SCALE }}
              onPointerDown={onPagePointerDown}
              onPointerMove={onPagePointerMove}
              onPointerUp={onPagePointerUp}
            >
              {currentPage.image ? <img className="pdf-image" src={currentPage.image} alt={`PDF page ${pageIndex + 1}`} /> : currentPage.source === "blank" ? <BlankDocument /> : <SampleDocument pageIndex={pageIndex} />}
              {currentPage.source === "pdf" && !pageDetectedTextItems.length && !currentPage.text?.trim() && (
                <div className="ocr-state">
                  <ScanText size={16} />
                  Scanned page detected. OCR is not enabled in this browser build yet.
                </div>
              )}
              {tool === "editText" && pageDetectedTextItems.length > 0 && (
                <div className="smart-text-page-hint">
                  <ScanText size={15} />
                  Click any blue outline to edit the original PDF words.
                </div>
              )}
              <div className="annotation-layer">
                {pageDeletedTextItems.map((item) => (
                  <div
                    key={`deleted-${item.id}`}
                    className="detected-text-whiteout"
                    style={{
                      left: `${Math.max(0, item.x * 100 - 0.25)}%`,
                      top: `${Math.max(0, item.y * 100 - 0.18)}%`,
                      width: `${Math.min(100, item.w * 100 + 0.5)}%`,
                      height: `${Math.min(100, item.h * 100 + 0.36)}%`,
                    }}
                    aria-hidden="true"
                  />
                ))}
                {pageDetectedTextItems.map((item) => {
                  const isActive = item.id === selectedDetectedTextId;
                  const displayScale = (zoom / 100) * EDITOR_PAGE_SCALE;
                  return (
                    <div
                      key={item.id}
                      data-detected-text-id={item.id}
                      className={`detected-text-item ${item.isEdited ? "is-edited" : ""} ${isActive ? "is-selected" : ""} ${item.source === "ocr" && item.confidence < 0.75 ? "is-low-confidence" : ""}`}
                      style={{
                        left: `${item.x * 100}%`,
                        top: `${item.y * 100}%`,
                        width: `${item.w * 100}%`,
                        height: `${item.h * 100}%`,
                        color: item.color || colors.black,
                        fontSize: `${Math.max(6, item.fontSize * displayScale)}px`,
                        fontFamily: item.fontFamily || '"PP Agrandir", Inter, Arial, sans-serif',
                      }}
                      onPointerDown={(event) => startDetectedTextDrag(event, item)}
                    >
                      {isActive && (
                        <div className="detected-text-toolbar" onPointerDown={(event) => event.stopPropagation()}>
                          <button type="button" className="mini-grip" title="Move" onPointerDown={(event) => startDetectedTextDrag(event, item)}><GripVertical size={15} /></button>
                          <button type="button" title="Smaller text" onClick={() => updateDetectedTextItem(item.id, { fontSize: clamp(item.fontSize - 1, 6, 54) })}>-</button>
                          <span>{Math.round(item.fontSize)}</span>
                          <button type="button" title="Larger text" onClick={() => updateDetectedTextItem(item.id, { fontSize: clamp(item.fontSize + 1, 6, 54) })}>+</button>
                          <button type="button" className="color-dot" title="Switch color" onClick={() => updateDetectedTextItem(item.id, { color: item.color === colors.black ? colors.blue : colors.black })} />
                          <button type="button" title="Duplicate" onClick={() => duplicateDetectedTextItem(item)}><Copy size={15} /></button>
                          <button type="button" title="Remove from export" onClick={() => deleteDetectedTextItem(item.id)}><Trash2 size={15} /></button>
                          <button type="button" title="Done" onClick={() => setSelectedDetectedTextId(null)}><CheckCircle2 size={15} /></button>
                        </div>
                      )}
                      <EditableTextContent
                        className="detected-text-content"
                        editable={isActive}
                        spellCheck="false"
                        value={item.currentText}
                        onPointerDown={(event) => {
                          if (tool === "textHighlight" || tool === "erase") {
                            startDetectedTextDrag(event, item);
                            return;
                          }
                          event.stopPropagation();
                          setSelectedDetectedTextId(item.id);
                          setSelectedId(null);
                          setTool("editText");
                        }}
                        onFocus={() => {
                          setSelectedDetectedTextId(item.id);
                          setSelectedId(null);
                          setTool("editText");
                        }}
                        onChange={(element) => updateDetectedTextContent(item.id, element)}
                      />
                      {isActive && <span className="resize-handle" onPointerDown={(event) => startDetectedTextResize(event, item)} />}
                    </div>
                  );
                })}
                {pageAnnotations.map((annotation) => (
                  <ProfessionalAnnotation
                    key={annotation.id}
                    annotation={annotation}
                    selected={annotation.id === selectedId}
                    zoom={zoom}
                    activeTool={tool}
                    onSelect={setSelectedId}
                    onCommit={updateAnnotation}
                    onUpdate={updateAnnotation}
                    onDelete={(id) => {
                      commitAnnotations(annotations.filter((item) => item.id !== id));
                      setSelectedId(null);
                    }}
                  />
                ))}
                {draft && draft.page === pageIndex && draft.type === "draw" && (
                  <svg className="ink-layer drafting" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline points={draft.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")} fill="none" stroke={draft.color} strokeWidth={Math.max(0.15, (draft.strokeWidth / BASE_PAGE_WIDTH) * 100)} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {draft && draft.page === pageIndex && (draft.type === "highlight" || draft.type === "whiteout") && (
                  <div className={`annotation ${draft.type} drafting`} style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%`, backgroundColor: draft.color, opacity: draft.opacity }} />
                )}
                {draft && draft.page === pageIndex && (draft.type === "rectangle" || draft.type === "circle") && (
                  <div
                    className={`annotation shape ${draft.type} drafting`}
                    style={{
                      left: `${draft.x * 100}%`,
                      top: `${draft.y * 100}%`,
                      width: `${draft.w * 100}%`,
                      height: `${draft.h * 100}%`,
                      borderColor: draft.color,
                      borderWidth: `${Math.max(1, draft.strokeWidth || 2)}px`,
                    }}
                  />
                )}
                {draft && draft.page === pageIndex && (draft.type === "line" || draft.type === "arrow") && (
                  <div className={`annotation line-box ${draft.type === "arrow" ? "arrow-line" : ""} drafting`} style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100" y2="100" stroke={draft.color} strokeWidth={Math.max(1, draft.strokeWidth || 3)} strokeLinecap="round" />
                      {draft.type === "arrow" && <polyline points="78,100 100,100 100,78" fill="none" stroke={draft.color} strokeWidth={Math.max(1, draft.strokeWidth || 3)} strokeLinecap="round" strokeLinejoin="round" />}
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className={`inspector-wrap ${isInspectorCollapsed ? "is-collapsed" : ""}`}>
          <button type="button" className="collapse-inspector" onClick={() => setIsInspectorCollapsed((value) => !value)} title={isInspectorCollapsed ? "Open properties" : "Close properties"}>
            {isInspectorCollapsed ? <PanelLeftOpen size={17} /> : <X size={17} />}
          </button>
          {!isInspectorCollapsed && (
            <Inspector
              selected={selected}
              signatureText={signatureText}
              setSignatureText={setSignatureText}
              updateAnnotation={updateAnnotation}
              clearSelection={() => setSelectedId(null)}
              bringSelectedToFront={bringSelectedToFront}
              sendSelectedToBack={sendSelectedToBack}
              alignSelectedCenter={alignSelectedCenter}
              addCustomSelectedColor={addCustomSelectedColor}
              duplicateSelected={duplicateSelected}
              deleteSelected={deleteSelected}
              activeTool={tool}
              toolSettings={toolSettings}
              setToolSettings={setToolSettings}
              fileName={fileName}
              pages={pages}
              annotations={annotations}
              saveState={saveState}
              saveStatusLabel={saveStatusLabel}
              onSave={saveDocumentToAccount}
              onExport={exportPdf}
              onShare={openShareSettings}
              onPrint={() => window.print()}
              onSignatureModal={() => { setSignatureModalMode("signature"); setSignatureModalOpen(true); }}
            />
          )}
        </aside>
        <aside className="lumin-right-rail">
          <button type="button" title="Search" className={isSearchOpen ? "is-active" : ""} onClick={() => {
            setIsSearchOpen((value) => !value);
            setIsCommentsOpen(false);
          }}><Search size={25} /></button>
          <button type="button" title="Comments" className={isCommentsOpen ? "is-active" : ""} onClick={() => {
            setTool("comment");
            setIsCommentsOpen((value) => !value);
            setIsSearchOpen(false);
          }}><MessageSquare size={24} /></button>
          <span />
          <button type="button" title="Download" onClick={exportPdf}><Download size={25} /></button>
          <button type="button" title="Print" onClick={() => window.print()}><Printer size={25} /></button>
          <button type="button" title="Share link" onClick={openShareSettings}><Share2 size={25} /></button>
          <span />
          <button type="button" title="Add page" onClick={addBlankPage}><Plus size={25} /></button>
        </aside>
        {isSearchOpen && (
          <DocumentSearchPanel
            query={documentSearchQuery}
            setQuery={setDocumentSearchQuery}
            results={searchResults}
            activeIndex={activeSearchIndex}
            onClose={() => setIsSearchOpen(false)}
            onSelect={goToSearchResult}
          />
        )}
        {isCommentsOpen && (
          <DocumentCommentsPanel
            comments={commentResults}
            selectedId={selectedId}
            onClose={() => setIsCommentsOpen(false)}
            onAddComment={() => {
              setTool("comment");
              setIsCommentsOpen(false);
              showToast("Click the page to place a comment.");
            }}
            onSelect={goToComment}
          />
        )}
      </section>

      <footer className="status-bar">
        <div />
        <div className="page-nav" aria-label="Zoom and page navigation">
          <button className="page-nav-zoom" type="button" onClick={() => setZoom((value) => clamp(value - 10, 60, 160))} title="Zoom out" aria-label="Zoom out"><Minus size={21} strokeWidth={2.6} /></button>
          <select className="page-nav-zoom-select" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Zoom level">
            {zoomOptions.map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <button className="page-nav-zoom" type="button" onClick={() => setZoom((value) => clamp(value + 10, 60, 160))} title="Zoom in" aria-label="Zoom in"><Plus size={22} strokeWidth={2.6} /></button>
          <span className="page-nav-divider" aria-hidden="true" />
          <button type="button" onClick={() => setPageIndex(0)} title="First page" aria-label="First page"><ChevronLeft size={25} strokeWidth={2.4} /></button>
          <input aria-label="Current page" inputMode="numeric" min="1" max={pages.length} value={pageIndex + 1} onChange={(event) => setPageIndex(clamp(Number(event.target.value) - 1 || 0, 0, pages.length - 1))} />
          <span className="page-nav-total">/ {pages.length}</span>
          <button type="button" onClick={() => setPageIndex((value) => clamp(value - 1, 0, pages.length - 1))} title="Previous page" aria-label="Previous page"><ChevronUp size={25} strokeWidth={2.4} /></button>
          <button type="button" onClick={() => setPageIndex((value) => clamp(value + 1, 0, pages.length - 1))} title="Next page" aria-label="Next page"><ChevronDown size={25} strokeWidth={2.4} /></button>
          <button type="button" onClick={() => setPageIndex(pages.length - 1)} title="Last page" aria-label="Last page"><ChevronRight size={25} strokeWidth={2.4} /></button>
        </div>
        <div className="status-tools">
          <button type="button" onClick={() => setZoom((value) => clamp(value - 10, 60, 160))}>-</button>
          <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            {zoomOptions.map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <button type="button" onClick={() => setZoom((value) => clamp(value + 10, 60, 160))}>+</button>
          <span>X: 612.3</span>
          <span>Y: 792.1</span>
        </div>
      </footer>
      {signatureModalOpen && (
        <SignatureModal
          defaultName={signatureText}
          mode={signatureModalMode}
          onClose={() => setSignatureModalOpen(false)}
          onSave={(signature) => {
            setSignatureText(signature.content || signatureText);
            setSignatureModalOpen(false);
            if (signatureModalMode === "initials") {
              setTool("initials");
              showToast("Initials are ready. Click the page to place them.");
            } else {
              setActiveSignature(signature);
              setTool("signature");
              showToast("Signature ready. Click the page to place it.");
            }
          }}
        />
      )}
      {shareModalOpen && (
        <ShareModal
          fileName={fileName}
          onExport={exportPdf}
          onClose={() => setShareModalOpen(false)}
        />
      )}
      {signatureRequestModalOpen && (
        <SignatureRequestModal
          fileName={fileName}
          onClose={() => setSignatureRequestModalOpen(false)}
          onPrepare={prepareSignatureRequest}
        />
      )}
      {protectModalOpen && (
        <ProtectPdfModal
          fileName={fileName}
          onClose={() => setProtectModalOpen(false)}
          onProtect={protectDocument}
        />
      )}
      {upgradeModalOpen && (
        <UpgradeModal
          onClose={() => setUpgradeModalOpen(false)}
          onSelectPlan={(plan) => {
            setUpgradeModalOpen(false);
            showToast(`${plan} workspace selected. Billing checkout can be connected next.`);
          }}
        />
      )}
      {authRequiredAction && (
        <AuthRequiredModal
          action={authRequiredAction}
          onClose={dismissAuthAction}
          onSignIn={continueAuthAction}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LandingPage({ fileInputRef, onUpload, onSelectFiles, onLogin }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadActive, setUploadActive] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const categories = ["All", "Prepare", "Edit", "Sign", "Organize", "Export"];
  const tools = [
    ["Upload PDF", "Local file", "Prepare", "Start here", Upload],
    ["Blank document", "New PDF", "Prepare", "", FilePlus2],
    ["Find fields", "Auto-fill", "Prepare", "", ScanText],
    ["Edit text", "Live text", "Edit", "Popular", Type],
    ["Highlight", "Markup", "Edit", "", Highlighter],
    ["Whiteout", "Redact", "Edit", "", Eraser],
    ["Draw", "Pen", "Edit", "", Paintbrush],
    ["Add image", "Media", "Edit", "", ImageIcon],
    ["Type signature", "eSign", "Sign", "Fast", PenLine],
    ["Request signature", "Share", "Sign", "", Send],
    ["Comments", "Review", "Sign", "", MessageSquare],
    ["Merge files", "Pages", "Organize", "", Grid2X2],
    ["Reorder pages", "Pages", "Organize", "", Move],
    ["Delete pages", "Cleanup", "Organize", "", Trash2],
    ["Compress", "Export", "Export", "", Download],
    ["Download PDF", "Export", "Export", "Ready", ArrowDownToLine],
    ["Print packet", "Output", "Export", "", Printer],
  ];
  const visibleTools = activeCategory === "All" ? tools : tools.filter((tool) => tool[2] === activeCategory);
  const faq = [
    ["Can I edit text that is already inside a PDF?", "Yes. The editor detects selectable PDF text and lets you edit, remove, restyle, or whiteout existing words before export."],
    ["Do I need an account before uploading?", "No. The first upload is immediate. Accounts are used for saving documents, syncing work, and returning to recent files."],
    ["Does signing work inside the browser?", "Yes. You can type, draw, or place a signature, then download or share the completed PDF."],
    ["What happens after I upload?", "The file opens in the editor with page thumbnails, zoom controls, text tools, drawing, comments, fields, and export actions."],
    ["Can teams use this later?", "Yes. The dashboard, cloud save state, and sharing surfaces are already designed around team document workflows."],
  ];
  const navItems = [
    ["Workflow", "#workflow"],
    ["Tools", "#tools"],
    ["Insights", "#insights"],
    ["Security", "#security"],
  ];
  const workflow = [
    ["01", "Upload or start blank", "Open a PDF from your device or begin with a clean document.", Upload],
    ["02", "Edit on the page", "Update text, add fields, annotate, draw, whiteout, and place images.", PenLine],
    ["03", "Send the final PDF", "Sign, download, print, or share from the same workspace.", Download],
  ];
  const insights = [
    ["Edit", "Change existing words, add new text, highlight important details, or whiteout content.", "Document editing"],
    ["Sign", "Create a typed or drawn signature and place it exactly where it belongs.", "Approvals"],
    ["Organize", "Reorder pages, merge packets, delete extras, and keep the file clean.", "Page control"],
    ["Export", "Download, print, or share a finished PDF without leaving the browser.", "Delivery"],
  ];

  const uploadClick = () => {
    setUploadActive(true);
    onSelectFiles();
  };

  return (
    <main className="cosmic-page">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <a className="cosmic-topline" href="#security">Secure browser-based PDF editing for teams <ArrowDownToLine size={14} /></a>
      <header className="cosmic-header">
        <a className="cosmic-brand blank-brand" href="#hero" onClick={() => setMobileMenuOpen(false)}><span><Box size={17} /></span></a>
        <nav className="cosmic-nav" aria-label="Primary">
          {navItems.map(([label, href]) => <a key={label} href={href}>{label}{label === "Tools" && <ChevronDown size={13} />}</a>)}
        </nav>
        <div className="cosmic-header-actions">
          <button type="button" className="cosmic-login" onClick={onLogin}>Log in</button>
          <button type="button" className="cosmic-upload-small" onClick={uploadClick}>Upload PDF</button>
          <button type="button" className="cosmic-menu" onClick={() => setMobileMenuOpen((value) => !value)} aria-expanded={mobileMenuOpen} aria-label="Open menu"><List size={20} /></button>
        </div>
        {mobileMenuOpen && (
          <div className="cosmic-mobile-panel">
            {navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}>{label}<ChevronDown size={14} /></a>)}
            <button type="button" onClick={onLogin}><Users size={16} /> Log in</button>
            <button type="button" onClick={uploadClick}><Upload size={16} /> Upload your PDF</button>
          </div>
        )}
      </header>

      <section id="hero" className="cosmic-hero">
        <div className="cosmic-hero-inner">
          <p className="cosmic-kicker">PDF editing workspace</p>
          <h1>Edit, sign, and manage PDFs in one secure workspace.</h1>
          <p>A clean browser editor for text changes, signatures, fields, page organization, and finished PDF exports.</p>
          <div
            className={`cosmic-dropzone ${uploadActive ? "is-active" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setUploadActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setUploadActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setUploadActive(false);
              onUpload({ target: { files: event.dataTransfer.files, value: "" } });
            }}
          >
            <div className="cosmic-drop-copy">
              <div className="cosmic-upload-icon"><Upload size={34} /></div>
              <h2>{uploadActive ? "Release to open your PDF" : "Upload a PDF to start editing"}</h2>
              <p>Open the editor with text tools, drawing, comments, signatures, page controls, and export actions ready.</p>
              <button type="button" onClick={uploadClick}><Zap size={17} fill="currentColor" /> Upload your PDF</button>
            </div>
            <div className="cosmic-document-stack" aria-hidden="true">
              <img src="/cosmic-assets/3d-upload.png" alt="" />
              <div>
                <span>Secure workspace</span>
                <strong>Document.pdf</strong>
                <small>Edit text · sign · export</small>
              </div>
            </div>
          </div>
          <div className="cosmic-hand-note">No install. No clutter. Just the tools to finish.</div>
          <div className="cosmic-trustpilot" id="security">
            <strong><CheckCircle2 size={15} /> Secure upload</strong>
            <b>Browser-first editor</b>
            <span>No install required</span>
          </div>
          <div className="cosmic-security">
            <span><CheckCircle2 size={14} /> 256-bit SSL</span>
            <span><CheckCircle2 size={14} /> Cloud save ready</span>
            <span><CheckCircle2 size={14} /> Export-ready PDFs</span>
          </div>
        </div>
      </section>

      <section id="workflow" className="cosmic-steps">
        <p className="cosmic-pill">Workflow</p>
        <h2>A straightforward path from upload to final PDF.</h2>
        <p>The document stays centered while the tools stay close enough to work quickly.</p>
        <div className="cosmic-step-grid">
          {workflow.map(([num, title, copy, Icon]) => (
            <article key={title}><small>{num}</small><Icon size={24} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section id="tools" className="cosmic-tools">
        <p className="cosmic-pill">Toolbar</p>
        <h2>Core PDF tools, grouped around the work.</h2>
        <p>Choose the job you need to finish and jump straight into the editor.</p>
        <div className="cosmic-filters">
          {categories.map((category) => (
            <button key={category} type="button" className={activeCategory === category ? "is-active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
          ))}
        </div>
        <div className="cosmic-tool-grid">
          {visibleTools.map(([name, format, category, badge, Icon]) => (
            <button key={name} type="button" className="cosmic-tool-card" onClick={uploadClick}>
              <span className="cosmic-chip-row">
                {format.split(" -> ").map((chip) => (
                  <span key={`${name}-${chip}`} className={`cosmic-file-chip cosmic-file-${chip.toLowerCase()}`}>{chip}</span>
                ))}
              </span>
              <strong>{name}</strong>
              {badge && <em>{badge}</em>}
            </button>
          ))}
        </div>
      </section>

      <section id="insights" className="cosmic-scenarios">
        <p className="cosmic-pill">Capabilities</p>
        <h2>Built for the document tasks teams repeat every day.</h2>
        <p>Each workflow is designed to be understandable before the user opens a menu.</p>
        <div>
          {insights.map(([value, copy, label]) => (
            <article key={label}>
              <small>{label}</small>
              <h3>{value}</h3>
              <p>{copy}</p>
              <button type="button" onClick={uploadClick}><Zap size={14} /> Start</button>
            </article>
          ))}
        </div>
      </section>

      <section className="cosmic-forms">
        <span className="cosmic-us-flag" aria-hidden="true"><FileText size={22} /></span>
        <div><strong>Made for contracts, resumes, packets, forms, and quick corrections.</strong><p>Upload the file, make the exact edit, and export the finished PDF.</p></div>
        <div className="cosmic-form-tags"><span>Edit text</span><span>Sign</span><span>Draw</span><span>Export</span></div>
        <a href="#tools">See tools <ChevronDown size={14} /></a>
      </section>

      <section className="cosmic-reviews">
        <div className="cosmic-review-heading">
          <h2>A cleaner way to finish PDFs.</h2>
          <aside>
            <strong><Star size={13} fill="currentColor" /> Product principles</strong>
            <b>Focused on the file</b>
            <p>Every surface supports editing, signing, review, or export.</p>
          </aside>
        </div>
        <div>
          {[
            ["/cosmic-assets/review-men-52.jpg", "Operations", "Contract packets", "Keep document review organized.", "Thumbnails, page controls, comments, and signing tools sit around the document instead of hiding behind disconnected menus."],
            ["/cosmic-assets/review-women-68.jpg", "Founders", "Hiring forms", "Fix details without switching tools.", "Edit existing text where possible, add new content anywhere, and export the final PDF from the same screen."],
            ["/cosmic-assets/review-men-45.jpg", "Students", "Resumes and forms", "Make small corrections quickly.", "Text, draw, highlight, image, field, and page tools stay in one focused browser workspace."],
          ].map(([src, name, role, title, copy]) => (
            <article key={title}>
              <img className="cosmic-review-photo" src={src} alt="" />
              <h3>{title}</h3>
              <p>{copy}</p>
              <footer><span><b>{name}</b><small>{role}</small></span></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="cosmic-faq">
        <h2>Questions, answered.</h2>
        <p>Everything you need to know before you upload.</p>
        <button type="button" className="cosmic-support-button" onClick={() => setSupportOpen((value) => !value)}><MessageSquare size={16} /> Chat with support</button>
        {supportOpen && <div className="cosmic-support">Support is online. Upload a PDF and we will guide you through editing, signing, or converting it.</div>}
        <div>
          {faq.map(([question, answer], index) => (
            <article key={question} className={openFaq === index ? "is-open" : ""}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<Plus size={17} /></button>
              {openFaq === index && <p>{answer}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="cosmic-compliance" aria-label="Certifications">
        <strong>Workspace standards</strong>
        {["Secure upload", "Cloud save ready", "Export controls", "PDF text editing", "eSignature tools", "Page organization"].map((item) => (
          <span key={item}><CheckCircle2 size={14} /> {item}</span>
        ))}
      </section>

      <section className="cosmic-final-cta">
        <h2>Open the file.<br />Make the edit.<br />Send the finished PDF.</h2>
        <p>A serious PDF editor should feel quick, quiet, and ready when the deadline hits.</p>
        <button type="button" onClick={uploadClick}><FilePlus2 size={18} /> Upload your PDF - free</button>
        <div><span><Zap size={14} /> Fast start</span><span><CheckCircle2 size={14} /> Secure workspace</span><span><Grid2X2 size={14} /> Full editor</span></div>
      </section>

      <footer className="cosmic-footer">
        <div><a className="cosmic-brand blank-brand" href="#hero"><span><Box size={17} /></span></a><p>A browser PDF workspace for editing, signing, reviewing, and exporting finished documents.</p></div>
        <div><strong>Editor</strong><a href="#tools">Text edits</a><a href="#tools">Draw</a><a href="#tools">Highlight</a><a href="#tools">Whiteout</a></div>
        <div><strong>Signing</strong><a href="#tools">Type signature</a><a href="#tools">Draw signature</a><a href="#tools">Comments</a><a href="#tools">Share</a></div>
        <div><strong>Pages</strong><a href="#tools">Merge</a><a href="#tools">Reorder</a><a href="#tools">Delete</a><a href="#tools">Print</a></div>
        <div><strong>Product</strong><a href="#workflow">Workflow</a><a href="#insights">Insights</a><a href="#security">Security</a><a href="#hero">Support</a></div>
        <div className="cosmic-footer-bottom"><span>Browser workspace</span><span>PDF editor</span><span>eSign tools</span><em>SSL 256</em><em>Cloud ready</em></div>
      </footer>
    </main>
  );
}

function AuthPage({ mode, setMode, onBack, backLabel = "Back to home", onComplete, onPasswordReset, authReady, isFirebaseConfigured, routeNotice = "" }) {
  const isSignup = mode === "signup";
  const isPasswordReset = mode === "forgot-password";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAuth = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!isFirebaseConfigured) {
      setError("Sign-in is temporarily unavailable while the secure connection is being set up.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email to continue.");
      return;
    }
    if (isPasswordReset) {
      setError("");
      setIsSubmitting(true);
      const result = await onPasswordReset(email);
      setIsSubmitting(false);
      if (result?.ok) setNotice("Password reset email sent.");
      else setError(result?.error || "Could not send a password reset email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const result = await onComplete({ email: email.trim(), password, name: name.trim() });
    setIsSubmitting(false);
    if (!result?.ok) setError(result?.error || "Authentication failed.");
  };

  const submitGoogleAuth = async () => {
    setNotice("");
    if (!isFirebaseConfigured) {
      setError("Sign-in is temporarily unavailable while the secure connection is being set up.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const result = await onComplete({ provider: "google" });
    setIsSubmitting(false);
    if (!result?.ok) setError(result?.error || "Google sign-in failed.");
  };

  const switchMode = () => {
    setError("");
    setNotice("");
    setMode(isSignup ? "login" : "signup");
  };

  return (
    <main className="auth-shell">
      <section className="auth-showcase" aria-label="FixThatPDF product preview">
        <button type="button" className="auth-showcase-brand" onClick={onBack} aria-label="FixThatPDF home"><BrandWordmark /></button>
        <div className="auth-showcase-copy">
          <span>Every PDF task</span>
          <h1>Pick up right where you left off.</h1>
          <p>Edit, sign, organize, and export in the same focused workspace.</p>
        </div>
        <img src={`${import.meta.env.BASE_URL}homepage/hero-product-stage.png`} alt="FixThatPDF upload workspace preview" />
      </section>
      <section className="auth-card" aria-label={isSignup ? "Create account" : isPasswordReset ? "Reset password" : "Log in"}>
        <button type="button" className="auth-back" onClick={onBack}>{backLabel}</button>
        <button type="button" className="auth-mark auth-realpdf-brand" onClick={onBack} aria-label="FixThatPDF home"><BrandWordmark /></button>
        <h2>{isSignup ? "Create your workspace" : isPasswordReset ? "Reset your password" : "Welcome back"}</h2>
        <p className="auth-intro">{isSignup ? "Start editing, signing, and organizing PDFs in one focused place." : isPasswordReset ? "Enter your account email and we will send the existing Firebase reset flow." : "Sign in to continue working with your PDFs."}</p>
        {routeNotice && <div className="auth-notice">{routeNotice}</div>}
        {!isFirebaseConfigured && (
          <div className="auth-error">
            Sign-in is temporarily unavailable while the secure connection is being set up.
          </div>
        )}
        {!isPasswordReset && (
          <>
            <button type="button" className="sso-button google-button" onClick={submitGoogleAuth} disabled={!authReady || isSubmitting || !isFirebaseConfigured}>
              <span aria-hidden="true">G</span>
              Sign in with Google
            </button>
            <div className="auth-divider"><span /> Or continue with <span /></div>
          </>
        )}
        <form onSubmit={submitAuth}>
          {isSignup && (
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />
          </label>
          {!isPasswordReset && (
            <label>
              <span className="auth-label-row">
                Password
                {!isSignup && <button type="button" aria-label="Forgot password?" onClick={() => setMode("forgot-password")}>Forgot password?</button>}
              </span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 6 characters" : "Enter your password"} />
            </label>
          )}
          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}
          <button type="submit" className="auth-submit" disabled={!authReady || isSubmitting || !isFirebaseConfigured}>
            {isSubmitting ? "Connecting..." : isSignup ? "Create account" : isPasswordReset ? "Send reset email" : "Sign in with password"}
          </button>
        </form>
        <p className="auth-privacy">Check our <button type="button">Privacy Notice</button>.</p>
        <div className="auth-switch">
          <span>{isSignup ? "Already have an account?" : isPasswordReset ? "Remembered your password?" : "New to FixThatPDF?"}</span>
          <button type="button" onClick={isPasswordReset ? () => setMode("login") : switchMode}>{isSignup ? "Sign in" : isPasswordReset ? "Back to login" : "Create an account"}</button>
        </div>
      </section>
    </main>
  );
}

export function ToolSettingsPanel({ tool, settings, setSettings, selectedTextAnnotation, updateAnnotation }) {
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const isEditingSelectedText = selectedTextAnnotation?.type === "text";
  const effectiveTool = isEditingSelectedText ? "text" : tool;
  const activeSettings = isEditingSelectedText
    ? {
      ...settings,
      textColor: selectedTextAnnotation.color || settings.textColor,
      textSize: selectedTextAnnotation.fontSize || settings.textSize,
      fontFamily: selectedTextAnnotation.fontFamily || settings.fontFamily,
      textAlign: selectedTextAnnotation.textAlign || settings.textAlign,
      lineHeight: selectedTextAnnotation.lineHeight || settings.lineHeight,
      textBold: !!selectedTextAnnotation.bold,
      textItalic: !!selectedTextAnnotation.italic,
      textUnderline: !!selectedTextAnnotation.underline,
    }
    : settings;
  const update = (patch) => {
    setSettings((current) => ({ ...current, ...patch }));
    if (!isEditingSelectedText || !updateAnnotation) return;
    const annotationPatch = {};
    if (Object.prototype.hasOwnProperty.call(patch, "textColor")) annotationPatch.color = patch.textColor;
    if (Object.prototype.hasOwnProperty.call(patch, "textSize")) annotationPatch.fontSize = patch.textSize;
    if (Object.prototype.hasOwnProperty.call(patch, "fontFamily")) annotationPatch.fontFamily = patch.fontFamily;
    if (Object.prototype.hasOwnProperty.call(patch, "textAlign")) annotationPatch.textAlign = patch.textAlign;
    if (Object.prototype.hasOwnProperty.call(patch, "lineHeight")) annotationPatch.lineHeight = patch.lineHeight;
    if (Object.prototype.hasOwnProperty.call(patch, "textBold")) annotationPatch.bold = patch.textBold;
    if (Object.prototype.hasOwnProperty.call(patch, "textItalic")) annotationPatch.italic = patch.textItalic;
    if (Object.prototype.hasOwnProperty.call(patch, "textUnderline")) annotationPatch.underline = patch.textUnderline;
    updateAnnotation(selectedTextAnnotation.id, annotationPatch);
  };
  const visibleStandardFonts = TEXT_STANDARD_FONTS.filter((font) => font.toLowerCase().includes(fontSearch.trim().toLowerCase()));
  const selectFont = (font) => {
    update({ fontFamily: font });
    setIsFontMenuOpen(false);
    setFontSearch("");
  };

  if (!["text", "field", "draw", "highlight", "textHighlight", "whiteout", "rectangle", "circle", "line", "arrow"].includes(effectiveTool)) {
    return null;
  }

  if (effectiveTool === "text" || effectiveTool === "field") {
    return (
      <div className={`tool-settings ${effectiveTool === "text" ? "text-format-settings" : "field-format-settings"}`}>
        {effectiveTool === "text" && <span className="settings-title text-settings-title">Text</span>}
        {effectiveTool === "text" && (
          <div className="font-menu-wrap">
            <button
              type="button"
              className="font-menu-trigger"
              aria-label="Font family"
              aria-haspopup="menu"
              aria-expanded={isFontMenuOpen}
              onClick={() => setIsFontMenuOpen((value) => !value)}
            >
              <span style={{ fontFamily: activeSettings.fontFamily }}>{activeSettings.fontFamily}</span>
              <ChevronDown size={15} />
            </button>
            {isFontMenuOpen && (
              <div className="editor-font-menu" role="menu" aria-label="Fonts">
                <input
                  type="search"
                  value={fontSearch}
                  onChange={(event) => setFontSearch(event.target.value)}
                  placeholder="Search fonts..."
                />
                <strong>STANDARD FONTS</strong>
                {visibleStandardFonts.map((font) => (
                  <button key={font} type="button" role="menuitemradio" aria-checked={activeSettings.fontFamily === font} onClick={() => selectFont(font)} style={{ fontFamily: font }}>
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <select className="text-size-select" aria-label="Font size" value={activeSettings.textSize} onChange={(event) => update({ textSize: Number(event.target.value) })}>
          {[8, 9, 10, 11, 12, 14, 16, 18, 24, 32, 48, 64].map((size) => <option key={size}>{size}</option>)}
        </select>
        <ColorControl value={activeSettings.textColor} onChange={(color) => update({ textColor: color })} />
        {effectiveTool === "text" && (
          <>
            <select className="line-height-select" aria-label="Line height" value={activeSettings.lineHeight} onChange={(event) => update({ lineHeight: Number(event.target.value) })}>
              {[1, 1.15, 1.25, 1.5, 2].map((size) => <option key={size} value={size}>{size}×</option>)}
            </select>
            <div className="align-group" aria-label="Text alignment">
              <button type="button" title="Align left" aria-label="Align left" aria-pressed={activeSettings.textAlign === "left"} className={activeSettings.textAlign === "left" ? "is-active" : ""} onClick={() => update({ textAlign: "left" })}><AlignLeft size={20} /></button>
              <button type="button" title="Align center" aria-label="Align center" aria-pressed={activeSettings.textAlign === "center"} className={activeSettings.textAlign === "center" ? "is-active" : ""} onClick={() => update({ textAlign: "center" })}><AlignCenter size={20} /></button>
              <button type="button" title="Align right" aria-label="Align right" aria-pressed={activeSettings.textAlign === "right"} className={activeSettings.textAlign === "right" ? "is-active" : ""} onClick={() => update({ textAlign: "right" })}><AlignRight size={20} /></button>
            </div>
            <div className="format-toggle-group" aria-label="Text format">
              <button type="button" aria-label="Bold" aria-pressed={activeSettings.textBold} className={activeSettings.textBold ? "is-active" : ""} onClick={() => update({ textBold: !activeSettings.textBold })}>B</button>
              <button type="button" aria-label="Italic" aria-pressed={activeSettings.textItalic} className={activeSettings.textItalic ? "is-active" : ""} onClick={() => update({ textItalic: !activeSettings.textItalic })}>I</button>
              <button type="button" aria-label="Underline" aria-pressed={activeSettings.textUnderline} className={activeSettings.textUnderline ? "is-active" : ""} onClick={() => update({ textUnderline: !activeSettings.textUnderline })}>U</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (tool === "draw") {
    const drawPalette = [
      { label: "Black", value: "#111827" },
      { label: "Blue", value: "#2563EB" },
      { label: "Red", value: "#E5484D" },
      { label: "Orange", value: "#F97316" },
      { label: "Green", value: "#16A34A" },
      { label: "Purple", value: "#7C3AED" },
    ];
    return (
      <div className="tool-settings draw-tool-settings" role="toolbar" aria-label="Draw settings">
        <span className="settings-title"><Paintbrush size={18} /> Draw</span>
        <div className="draw-setting-group draw-color-field">
          <span className="draw-setting-label">Color</span>
          <div className="draw-color-presets" aria-label="Pen color presets">
            {drawPalette.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={normalizePickerHexColor(settings.drawColor) === value ? "is-selected" : ""}
                style={{ backgroundColor: value }}
                aria-label={`Use ${label.toLowerCase()} pen`}
                aria-pressed={normalizePickerHexColor(settings.drawColor) === value}
                onClick={() => update({ drawColor: value })}
              />
            ))}
          </div>
          <div className="draw-custom-color">
            <ColorControl value={settings.drawColor} onChange={(color) => update({ drawColor: color })} variant="palette" label="Choose custom pen color" />
          </div>
        </div>
        <div className="draw-setting-group draw-size-field">
          <span className="draw-setting-label">Size</span>
          <div className="stroke-size-group" aria-label="Pen size presets">
            {[2, 4, 8, 12, 16].map((size) => (
              <button
                key={size}
                type="button"
                className={settings.drawStroke === size ? "is-active" : ""}
                aria-label={`Use ${size} pixel pen`}
                aria-pressed={settings.drawStroke === size}
                onClick={() => update({ drawStroke: size })}
              >
                <span style={{ width: Math.min(16, size + 4), height: Math.min(16, size + 4) }} />
                {size}
              </button>
            ))}
          </div>
          <label className="draw-fine-size">
            <span className="sr-only">Fine tune pen size</span>
            <input aria-label="Fine tune pen size" type="range" min="1" max="20" value={settings.drawStroke} onChange={(event) => update({ drawStroke: Number(event.target.value) })} />
          </label>
          <output className="draw-size-output" aria-live="polite">{settings.drawStroke}px</output>
        </div>
      </div>
    );
  }

  if (tool === "highlight" || tool === "textHighlight") {
    const opacityPercent = Math.round(settings.highlightOpacity * 100);
    return (
      <div className="tool-settings highlight-tool-settings" role="toolbar" aria-label={tool === "textHighlight" ? "Text highlight settings" : "Highlight settings"}>
        <span className="settings-title highlight-settings-title">{tool === "textHighlight" ? "Text highlight" : "Highlight"}</span>
        <div className="highlight-setting-group highlight-color-field">
          <span>Color</span>
          <ColorControl value={settings.highlightColor} onChange={(color) => update({ highlightColor: color })} />
        </div>
        <label className="highlight-setting-group highlight-opacity-field">
          <span>Opacity</span>
          <input aria-label="Highlight opacity" type="range" min="25" max="95" value={opacityPercent} onChange={(event) => update({ highlightOpacity: Number(event.target.value) / 100 })} />
        </label>
        <output className="highlight-opacity-output" aria-live="polite">{opacityPercent}%</output>
      </div>
    );
  }

  if (tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow") {
    return (
      <div className="tool-settings">
        <ColorControl value={settings.shapeColor} onChange={(color) => update({ shapeColor: color })} />
        <label>Stroke
          <input type="range" min="1" max="12" value={settings.shapeStroke} onChange={(event) => update({ shapeStroke: Number(event.target.value) })} />
        </label>
        <output>{settings.shapeStroke}px</output>
      </div>
    );
  }

  return (
    <div className="tool-settings">
      <label>Whiteout opacity
        <input type="range" min="70" max="100" value={Math.round(settings.whiteoutOpacity * 100)} onChange={(event) => update({ whiteoutOpacity: Number(event.target.value) / 100 })} />
      </label>
      <output>{Math.round(settings.whiteoutOpacity * 100)}%</output>
    </div>
  );
}

function normalizePickerHexColor(value) {
  if (!value || typeof value !== "string") return colors.black;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split("").map((char) => char + char).join("")}`.toUpperCase();
  }
  return colors.black;
}

function hexToPickerRgb(value) {
  const hex = normalizePickerHexColor(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function pickerRgbToHex(r, g, b) {
  return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexToHsv(value) {
  const { r, g, b } = hexToPickerRgb(value);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex(h, s, v) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [chroma, x, 0];
  else if (h < 120) [r, g, b] = [x, chroma, 0];
  else if (h < 180) [r, g, b] = [0, chroma, x];
  else if (h < 240) [r, g, b] = [0, x, chroma];
  else if (h < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  return pickerRgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function ColorControl({ value, onChange, variant = "swatch", label = "Choose color" }) {
  const palette = ["#D8D8D8", "#9B9B9B", "#666666", "#333333", "#000000", "#FF6428", "#F59E32", "#FFF14A", "#5ADE3F", "#0E7C16", "#3A8EF6", "#14148B", "#E94472"];
  const [isOpen, setIsOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(normalizePickerHexColor(value));
  const hsv = hexToHsv(draftColor);
  const hue = hsv.h;
  const pureHue = `hsl(${hue} 100% 50%)`;

  useEffect(() => {
    if (!isOpen) setDraftColor(normalizePickerHexColor(value));
  }, [isOpen, value]);

  const updateFromSquare = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    setDraftColor(hsvToHex(hue, s, v));
  };

  const updateFromHue = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextHue = Math.max(0, Math.min(359, ((event.clientX - rect.left) / rect.width) * 360));
    const current = hexToHsv(draftColor);
    setDraftColor(hsvToHex(nextHue, current.s || 1, current.v || 1));
  };

  const dragColor = (handler) => (event) => {
    event.preventDefault();
    handler(event);
    const move = (moveEvent) => handler(moveEvent);
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const saveColor = () => {
    const color = normalizePickerHexColor(draftColor);
    setDraftColor(color);
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="color-control" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={`color-trigger ${variant === "palette" ? "is-palette" : ""}`}
        aria-label={label}
        aria-expanded={isOpen}
        onClick={() => {
          setDraftColor(normalizePickerHexColor(value));
          setIsOpen((open) => !open);
        }}
      >
        {variant === "palette" ? <Palette size={17} style={{ color: value }} /> : <span style={{ backgroundColor: value }} />}
      </button>
      {isOpen && (
        <div className="color-popover" role="dialog" aria-label="Choose color">
          <div
            className="color-square"
            style={{ background: `linear-gradient(to top, #000 0%, transparent 55%), linear-gradient(to right, #fff 0%, ${pureHue} 100%)` }}
            onPointerDown={dragColor(updateFromSquare)}
          >
            <span
              className="color-square-handle"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: draftColor }}
            />
          </div>
          <div className="color-hue" onPointerDown={dragColor(updateFromHue)}>
            <span className="color-hue-handle" style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hsvToHex(hue, 1, 1) }} />
          </div>
          <div className="color-palette" aria-label="Preset colors">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                className={normalizePickerHexColor(draftColor) === color ? "is-selected" : ""}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                onClick={() => setDraftColor(color)}
              />
            ))}
          </div>
          <div className="color-actions">
            <button type="button" className="color-cancel" onClick={() => setIsOpen(false)}>Cancel</button>
            <input
              aria-label="Hex color"
              value={draftColor}
              onChange={(event) => setDraftColor(event.target.value.toUpperCase())}
              onBlur={() => setDraftColor(normalizePickerHexColor(draftColor))}
              maxLength={7}
            />
            <button type="button" className="color-save" onClick={saveColor}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UploadLanding({
  section,
  onNavigate,
  fileInputRef,
  onUpload,
  onSelectFiles,
  onDropFile,
  onBlankPage,
  uploadError,
  uploadStage,
  isDraggingFile,
  setIsDraggingFile,
  documents,
  onOpenDocument,
  onRenameDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onDownloadDocument,
  onToggleFavorite,
  onMoveDocument,
  currentUser,
  onLogout,
}) {
  const activeSection = section || "Home";
  const sectionPaths = {
    Home: ROUTE_PATHS.dashboard,
    Documents: ROUTE_PATHS.documents,
    Templates: ROUTE_PATHS.appTemplates,
    Agreements: ROUTE_PATHS.signatures,
    Signatures: ROUTE_PATHS.signatures,
    "AI Tools": ROUTE_PATHS.tools,
    Shared: ROUTE_PATHS.documents,
    Settings: ROUTE_PATHS.settings,
    Trash: ROUTE_PATHS.trash,
    Billing: ROUTE_PATHS.settings,
    Team: ROUTE_PATHS.settings,
    Integrations: ROUTE_PATHS.settings,
  };
  const setActiveSection = (nextSection) => onNavigate(sectionPaths[nextSection] || ROUTE_PATHS.dashboard);
  const [searchQuery, setSearchQuery] = useState("");
  const suggestionView = "recent";
  const [openPanel, setOpenPanel] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDrafts, setInviteDrafts] = useState([]);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState(null);
  const userName = currentUser?.name || currentUser?.email || "Local workspace";
  const userInitials = userName
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
  const dashboardFirstName = currentUser?.name?.trim().split(/\s+/)[0]
    || currentUser?.email?.split("@")[0]
    || "there";
  const dashboardAccountName = currentUser?.name?.trim()
    || currentUser?.email?.split("@")[0]
    || "Local";
  const dashboardHour = new Date().getHours();
  const dashboardGreeting = dashboardHour < 12
    ? "Good morning"
    : dashboardHour < 18
      ? "Good afternoon"
      : "Good evening";

  const primaryNav = [
    { label: "Dashboard", section: "Home", icon: Home },
    { label: "Documents", icon: FileText },
    { label: "Signatures", icon: PenLine },
    { label: "Templates", icon: Grid2X2 },
  ];

  const utilityNav = [
    { label: "Trash", icon: Trash2 },
  ];

  const templateCards = [
    { title: "NDA agreement", detail: "Confidentiality, non-compete, and signature fields", icon: Box },
    { title: "Contract review", detail: "Comment-ready workspace for legal review", icon: MessageSquare },
    { title: "Offer letter", detail: "Reusable hiring packet with date and checkbox fields", icon: FilePlus2 },
    { title: "Invoice approval", detail: "Simple payable form with approval routing", icon: CheckCircle2 },
  ];

  const agreementFlows = [
    { title: "Create agreement", detail: "Start a clean agreement page and add fields.", icon: FilePlus2, action: onBlankPage },
    { title: "Upload for review", detail: "Import a PDF and edit text, comments, or highlights.", icon: Upload, action: onSelectFiles },
    { title: "Prepare signing", detail: "Open a signing workspace with signature tools ready.", icon: PenLine, action: onBlankPage },
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (value) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
  const userDocuments = currentUser?.uid
    ? documents.filter((documentRecord) => documentRecord.ownerId === currentUser.uid)
    : documents;
  const filteredDocuments = userDocuments.filter((documentRecord) => (
    matchesSearch(documentRecord.name)
  ));
  const filteredTemplateCards = templateCards.filter(({ title, detail }) => matchesSearch(`${title} ${detail}`));
  const filteredAgreementFlows = agreementFlows.filter(({ title, detail }) => matchesSearch(`${title} ${detail}`));

  const dashboardDocumentPool = suggestionView === "starred"
    ? filteredDocuments.filter((documentRecord) => documentRecord.favorite)
    : suggestionView === "shared"
      ? filteredDocuments.filter((documentRecord) => /shared/i.test(documentRecord.location || ""))
      : filteredDocuments;
  const recentDashboardRows = [...dashboardDocumentPool]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 5);
  const storageUsed = userDocuments.reduce((total, documentRecord) => total + (documentRecord.size || 0), 0);
  const isUploading = uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status);

  const closePanel = () => setOpenPanel(null);

  const createInviteDraft = () => {
    const cleanedEmail = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      setWorkspaceNotice("Enter a valid teammate email.");
      return;
    }
    setInviteDrafts((items) => [{ id: makeId("workspace-invite"), email: cleanedEmail, createdAt: nowIso() }, ...items]);
    setInviteEmail("");
    setWorkspaceNotice("Invite draft created.");
  };

  const closeDocumentMenu = () => setOpenDocumentMenuId(null);

  const showFileInfo = (documentRecord) => {
    const details = [
      documentRecord.name,
      `${documentRecord.pageCount || documentRecord.pages?.length || 1} page${(documentRecord.pageCount || documentRecord.pages?.length || 1) === 1 ? "" : "s"}`,
      documentRecord.size ? formatBytes(documentRecord.size) : "Local browser document",
      `Location: ${documentRecord.location || "My documents"}`,
      `Last opened: ${formatDateTime(documentRecord.updatedAt)}`,
    ].join("\n");
    window.alert(details);
  };

  const runDocumentMenuAction = (event, action) => {
    event.stopPropagation();
    closeDocumentMenu();
    action();
  };

  const formatDashboardDate = (value) => new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value || nowIso()));

  const renderDocumentTable = (records, mode = "documents") => (
    records.length ? (
      <div className="lumin-document-table">
        <div className="lumin-doc-row lumin-doc-head">
          <span>Name</span>
          <span />
          <span>Location</span>
          <span>Last opened</span>
          <span />
        </div>
        {records.map((documentRecord) => {
          const isStoredDocument = mode === "documents" && !documentRecord.demo;
          return (
            <article key={documentRecord.id} className="lumin-doc-row">
              <button
                type="button"
                className="lumin-doc-name"
                onClick={() => (isStoredDocument ? onOpenDocument(documentRecord) : setActiveSection("Documents"))}
              >
                {documentRecord.pages?.[0]?.image ? (
                  <img src={documentRecord.pages[0].image} alt="" />
                ) : (
                  <FileText size={21} />
                )}
                <span>{documentRecord.name}</span>
              </button>
              <button
                type="button"
                className={`star-button ${documentRecord.favorite ? "is-favorite" : ""}`}
                title={documentRecord.favorite ? "Remove favorite" : "Add favorite"}
                aria-pressed={!!documentRecord.favorite}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isStoredDocument) {
                    onToggleFavorite(documentRecord);
                  } else {
                    setWorkspaceNotice("Open a saved document to add it to favorites.");
                  }
                }}
              >
                {documentRecord.favorite ? "★" : "☆"}
              </button>
              <span>{documentRecord.location || "My documents"}</span>
              <span>{formatDashboardDate(documentRecord.updatedAt)}</span>
              <div className="doc-actions">
                {isStoredDocument ? (
                  <div className="doc-menu-wrap">
                    <button
                      type="button"
                      className={`doc-menu-trigger ${openDocumentMenuId === documentRecord.id ? "is-open" : ""}`}
                      title="Document actions"
                      aria-haspopup="menu"
                      aria-expanded={openDocumentMenuId === documentRecord.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenDocumentMenuId((id) => (id === documentRecord.id ? null : documentRecord.id));
                      }}
                    >
                      <EllipsisVertical size={21} />
                    </button>
                    {openDocumentMenuId === documentRecord.id && (
                      <div className="doc-row-menu" role="menu" aria-label={`${documentRecord.name} actions`}>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => showFileInfo(documentRecord))}><FileText size={20} /> File info</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onOpenDocument(documentRecord))}><FilePlus2 size={20} /> Open</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onDuplicateDocument(documentRecord))}><Copy size={20} /> Make a copy</button>
                        <span />
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onRenameDocument(documentRecord))}><PenLine size={20} /> Rename</button>
                        <button type="button" role="menuitem" disabled title="Secure document links require the future token service"><Link size={20} /> Copy link unavailable</button>
                        <button type="button" role="menuitem" disabled title="Secure sharing requires the future token service"><Share2 size={20} /> Share unavailable</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onDownloadDocument(documentRecord))}><Download size={20} /> Download</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onToggleFavorite(documentRecord))}><Star size={20} /> {documentRecord.favorite ? "Unstar" : "Star"}</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onMoveDocument(documentRecord))}><Move size={20} /> Move</button>
                        <span />
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onDeleteDocument(documentRecord))}><Trash2 size={20} /> Remove</button>
                      </div>
                    )}
                  </div>
                ) : documentRecord.demo ? (
                  <span aria-hidden="true" />
                ) : (
                  <button type="button" onClick={() => setActiveSection(documentRecord.location)}>Use</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <div className="empty-library">
        <FileText size={34} />
        <h3>{normalizedQuery ? "No matching documents" : "No suggested documents yet"}</h3>
        <p>{normalizedQuery ? "Try a different search term or upload a PDF." : "Upload a PDF or create a blank agreement. Your recent files will appear in this table."}</p>
      </div>
    )
  );

  const renderRecentDashboardTable = () => (
    <div className="reference-document-table">
      <div className="reference-doc-row reference-doc-head">
        <span>Name</span><span>Owner</span><span>Last opened</span><span>Status</span><span />
      </div>
      {recentDashboardRows.length ? recentDashboardRows.map((documentRecord) => {
        const status = documentRecord.status || "Ready";
        const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return (
          <article key={documentRecord.id} className="reference-doc-row">
            <button type="button" className="reference-doc-name" onClick={() => onOpenDocument(documentRecord)}>
              <span className="reference-file-icon"><FileText size={20} /></span>
              <span><strong>{documentRecord.name}</strong><small>{documentRecord.location || "My Documents"}</small></span>
              <Star size={15} className="reference-row-star" fill={documentRecord.favorite ? "currentColor" : "none"} />
            </button>
            <span className="reference-doc-owner"><span>{userInitials}</span> You</span>
            <span>{formatDashboardDate(documentRecord.updatedAt)}</span>
            <span><em className={`reference-status is-${statusClass}`}>{status}</em></span>
            <div className="doc-actions">
              <div className="doc-menu-wrap">
                <button type="button" className={`doc-menu-trigger ${openDocumentMenuId === documentRecord.id ? "is-open" : ""}`} title="Document actions" aria-haspopup="menu" aria-expanded={openDocumentMenuId === documentRecord.id} onClick={(event) => {
                  event.stopPropagation();
                  setOpenDocumentMenuId((id) => (id === documentRecord.id ? null : documentRecord.id));
                }}><EllipsisVertical size={18} /></button>
                {openDocumentMenuId === documentRecord.id && (
                  <div className="doc-row-menu" role="menu" aria-label={`${documentRecord.name} actions`}>
                    <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onOpenDocument(documentRecord))}><FilePlus2 size={18} /> Open</button>
                    <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onRenameDocument(documentRecord))}><PenLine size={18} /> Rename</button>
                    <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onDownloadDocument(documentRecord))}><Download size={18} /> Download</button>
                    <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => onDeleteDocument(documentRecord))}><Trash2 size={18} /> Remove</button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      }) : (
        <div className="reference-dashboard-empty">
          <FileText size={26} />
          <strong>{normalizedQuery ? "No matching documents" : suggestionView === "starred" ? "No starred documents" : suggestionView === "shared" ? "No shared documents" : "No documents yet"}</strong>
          <span>{normalizedQuery ? "Try a different search." : "Upload a PDF and it will appear here."}</span>
          {!normalizedQuery && suggestionView === "recent" && <button type="button" onClick={onSelectFiles}>Upload PDF</button>}
        </div>
      )}
      {recentDashboardRows.length > 0 && <button type="button" className="reference-show-more" onClick={() => setActiveSection("Documents")}>View all documents <ChevronDown size={15} /></button>}
    </div>
  );

  const renderTemplateGrid = () => (
    filteredTemplateCards.length ? (
      <div className="enterprise-card-grid">
        {filteredTemplateCards.map(({ title, detail, icon: Icon }) => (
          <article key={title} className="enterprise-card">
            <Icon size={23} />
            <h3>{title}</h3>
            <p>{detail}</p>
            <button type="button" onClick={onBlankPage}>Use template</button>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty-library">
        <Grid2X2 size={34} />
        <h3>No matching templates</h3>
        <p>Try another search term or start from a blank PDF.</p>
      </div>
    )
  );

  const renderWorkspaceSection = () => {
    if (activeSection === "Documents") {
      return (
        <section className="document-library">
          <div className="library-head">
            <h2>Documents</h2>
            <button type="button" className="library-action" onClick={onSelectFiles}><Upload size={17} /> Upload</button>
          </div>
          {renderDocumentTable(filteredDocuments)}
        </section>
      );
    }

    if (activeSection === "Templates") {
      return (
        <section className="document-library enterprise-workspace-panel">
          <div className="library-head">
            <h2>Templates</h2>
            <button type="button" className="library-action" onClick={onBlankPage}><FilePlus2 size={17} /> Blank PDF</button>
          </div>
          {renderTemplateGrid()}
        </section>
      );
    }

    if (activeSection === "Shared") {
      return (
        <section className="document-library enterprise-workspace-panel">
          <div className="library-head">
            <h2>Shared</h2>
            <button type="button" className="library-action" onClick={() => setOpenPanel("invite")}><Users size={17} /> Invite</button>
          </div>
          <div className="enterprise-card-grid">
            <article className="enterprise-card">
              <Share2 size={23} />
              <h3>Review links</h3>
              <p>Copy workspace links for PDFs and prepare access settings before export.</p>
              <button type="button" onClick={() => setActiveSection("Documents")}>Choose document</button>
            </article>
            <article className="enterprise-card">
              <Users size={23} />
              <h3>Invite drafts</h3>
              <p>{inviteDrafts.length ? `${inviteDrafts.length} invite draft${inviteDrafts.length === 1 ? "" : "s"} ready.` : "Create reviewer or signer invites from the top bar."}</p>
              <button type="button" onClick={() => setOpenPanel("invite")}>Add invite</button>
            </article>
          </div>
        </section>
      );
    }

    if (activeSection === "Agreements" || activeSection === "Signatures") {
      const isSign = activeSection === "Signatures";
      return (
        <section className="document-library enterprise-workspace-panel">
          <div className="library-head">
            <h2>{isSign ? "Signatures" : "Agreements"}</h2>
            <button type="button" className="library-action" onClick={isSign ? onSelectFiles : onBlankPage}>
              {isSign ? <Upload size={17} /> : <FilePlus2 size={17} />}
              {isSign ? "Upload to sign" : "New agreement"}
            </button>
          </div>
          <div className="enterprise-card-grid">
            {filteredAgreementFlows.map(({ title, detail, icon: Icon, action }) => (
              <article key={title} className="enterprise-card">
                <Icon size={23} />
                <h3>{title}</h3>
                <p>{detail}</p>
                <button type="button" onClick={action}>{isSign && title === "Prepare signing" ? "Start signing" : "Start"}</button>
              </article>
            ))}
          </div>
          {!filteredAgreementFlows.length && (
            <div className="empty-library">
              <FileText size={34} />
              <h3>No matching workflows</h3>
              <p>Try another search term or upload a PDF to continue.</p>
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "Settings") {
      return (
        <section className="document-library enterprise-workspace-panel">
          <div className="library-head">
            <h2>Settings</h2>
            <span className="settings-status">Local workspace</span>
          </div>
          <div className="settings-grid">
            <article>
              <strong>Autosave</strong>
              <span>Enabled for edits, annotations, page organization, and signatures.</span>
            </article>
            <article>
              <strong>Favorites</strong>
              <span>{userDocuments.filter((documentRecord) => documentRecord.favorite).length} saved document{userDocuments.filter((documentRecord) => documentRecord.favorite).length === 1 ? "" : "s"} marked for quick access.</span>
            </article>
            <article>
              <strong>Invites</strong>
              <span>{inviteDrafts.length} invite draft{inviteDrafts.length === 1 ? "" : "s"} staged for the workspace.</span>
            </article>
            <article>
              <strong>Storage</strong>
              <span>{userDocuments.length} document{userDocuments.length === 1 ? "" : "s"} saved for this account, {formatBytes(storageUsed)} used.</span>
            </article>
            <article>
              <strong>Export policy</strong>
              <span>Download creates a rebuilt PDF with current page order and annotations.</span>
            </article>
          </div>
        </section>
      );
    }

    if (["Trash", "Billing", "Team", "Integrations"].includes(activeSection)) {
      const sectionDetails = {
        Trash: [Trash2, "Deleted documents", "Files moved to trash will be available here before permanent removal."],
        Billing: [CreditCard, "Plans and billing", "Manage your FixThatPDF plan, invoices, and payment details."],
        Team: [Users, "Workspace members", "Invite teammates and manage document collaboration access."],
        Integrations: [Plug, "Connected apps", "Connect cloud storage and workflow tools to your PDF workspace."],
      };
      const [SectionIcon, title, detail] = sectionDetails[activeSection];
      return (
        <section className="document-library enterprise-workspace-panel dashboard-simple-section">
          <div className="library-head"><h2>{activeSection}</h2></div>
          <div className="dashboard-simple-card">
            <SectionIcon size={28} />
            <div><h3>{title}</h3><p>{detail}</p></div>
            <button type="button" onClick={activeSection === "Team" ? () => setOpenPanel("invite") : () => setWorkspaceNotice(`${activeSection} settings are ready to connect.`)}>
              {activeSection === "Team" ? "Invite member" : "Open settings"}
            </button>
          </div>
        </section>
      );
    }

    return (
      <div className="dashboard-simple-home">
        <section
          className={`dashboard-simple-hero ${isDraggingFile ? "is-dragging" : ""} ${isUploading ? "is-uploading" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDraggingFile(false); }}
          onDrop={onDropFile}
        >
          <div>
            <span>{dashboardGreeting}, {dashboardFirstName}</span>
            <h1>What would you like to do?</h1>
            <p>{isDraggingFile ? "Release to open your PDF." : isUploading ? `${uploadStage.status}: ${uploadStage.fileName}` : "Upload a PDF to edit it, or start with a clean page."}</p>
            {uploadError && <p className="upload-error">{uploadError}</p>}
          </div>
          <div className="dashboard-simple-primary-actions">
            <button type="button" className="is-primary" onClick={onSelectFiles}><Upload size={19} /> Upload PDF</button>
            <button type="button" onClick={onBlankPage}><FilePlus2 size={19} /> Blank PDF</button>
          </div>
        </section>

        <section className="dashboard-essential-actions" aria-labelledby="dashboard-essential-title">
          <div className="dashboard-simple-section-head">
            <div><span>Quick start</span><h2 id="dashboard-essential-title">Choose a task</h2></div>
            <button type="button" onClick={() => onNavigate(ROUTE_PATHS.tools)}>All PDF tools <ChevronRight size={16} /></button>
          </div>
          <div>
            <button type="button" onClick={onSelectFiles}><span><PenLine size={21} /></span><strong>Edit a PDF</strong><small>Change text, add notes, and export</small><ChevronRight size={17} /></button>
            <button type="button" onClick={() => setActiveSection("Signatures")}><span><PenLine size={21} /></span><strong>Sign a PDF</strong><small>Add a signature, initials, or date</small><ChevronRight size={17} /></button>
            <button type="button" onClick={onSelectFiles}><span><Grid2X2 size={21} /></span><strong>Organize pages</strong><small>Reorder, rotate, duplicate, or delete</small><ChevronRight size={17} /></button>
          </div>
        </section>

        <section className="reference-recent-card dashboard-simple-recent">
          <div className="reference-section-head">
            <div><span>Workspace</span><h2>Recent documents</h2></div>
            <button type="button" className="reference-view-all" onClick={() => setActiveSection("Documents")}>View all</button>
          </div>
          {renderRecentDashboardTable()}
        </section>
      </div>
    );
  };

  return (
    <main className="upload-shell lumin-home">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <aside className="lumin-home-rail">
        <button type="button" className="dashboard-brand" aria-label="FixThatPDF dashboard" onClick={() => setActiveSection("Home")}><BrandWordmark /></button>
        <nav className="upload-nav" aria-label="Primary">
          {primaryNav.map(({ label, section: navSection = label, icon: Icon, badge }) => (
            <button key={label} type="button" className={navSection === activeSection ? "is-active" : ""} onClick={() => setActiveSection(navSection)}>
              <Icon size={19} />
              <span>{label}</span>
              {badge && <em className="dashboard-nav-badge">{badge}</em>}
            </button>
          ))}
        </nav>
        <nav className="upload-nav dashboard-utility-nav" aria-label="Document utilities">
          {utilityNav.map(({ label, icon: Icon }) => <button key={label} type="button" className={label === activeSection ? "is-active" : ""} onClick={() => setActiveSection(label)}><Icon size={19} /><span>{label}</span></button>)}
        </nav>
        <button type="button" className="dashboard-rail-help" onClick={() => onNavigate(ROUTE_PATHS.help)}><CircleHelp size={17} /><span>Help</span></button>
      </aside>

      <section className="upload-main">
        <header className="upload-topbar">
          <label className="lumin-search">
            <Search size={18} />
            <input type="search" placeholder="Search documents, templates, or tools..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            <kbd>⌘ K</kbd>
          </label>
          <div className="upload-top-actions">
            <button type="button" className="dashboard-top-upload" onClick={onSelectFiles}><Upload size={18} /> Upload PDF</button>
            <button type="button" className="top-avatar" aria-haspopup="dialog" aria-expanded={openPanel === "account"} onClick={() => setOpenPanel(openPanel === "account" ? null : "account")}><span>{userInitials}</span><i /><strong>{dashboardAccountName}</strong><ChevronDown size={15} /></button>
            {openPanel && (
              <div className={`workspace-popover ${openPanel === "account" ? "account-menu-popover" : ""}`} role={openPanel === "account" ? "dialog" : undefined} aria-label={openPanel === "account" ? "Account menu" : undefined}>
                <button type="button" className="popover-close" onClick={closePanel}><X size={16} /></button>
                {openPanel === "invite" && (
                  <>
                    <h3>Invite members</h3>
                    <p>Add teammates to review, annotate, and prepare PDFs together. This local prototype stores the invite draft in the workspace UI.</p>
                    <label>
                      <span>Email address</span>
                      <input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
                    </label>
                    <button type="button" className="popover-primary" onClick={createInviteDraft}>Create invite</button>
                    {inviteDrafts.length > 0 && (
                      <div className="invite-draft-stack">
                        {inviteDrafts.slice(0, 3).map((invite) => (
                          <div key={invite.id}>
                            <strong>{invite.email}</strong>
                            <span>{formatDateTime(invite.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {openPanel === "notifications" && (
                  <>
                    <h3>Notifications</h3>
                    <p>Autosave is active. Recent uploads, exports, and signature activity will appear here.</p>
                    <button type="button" className="popover-primary" onClick={() => setActiveSection("Documents")}>View documents</button>
                  </>
                )}
                {openPanel === "help" && (
                  <>
                    <h3>Help</h3>
                    <p>Use Upload to import a PDF, then annotate, organize pages, add signatures, print, or export from the editor.</p>
                    <button type="button" className="popover-primary" onClick={() => setActiveSection("Templates")}>Browse templates</button>
                  </>
                )}
                {openPanel === "account" && (
                  <>
                    <div className="account-menu-identity">
                      <span className="account-menu-avatar">{userInitials}</span>
                      <div><h3>{userName}</h3><p><Mail size={15} /> {currentUser?.email || "Files stay in this browser"}</p></div>
                    </div>
                    <div className="account-menu-actions">
                      <button type="button" className="account-menu-settings" onClick={() => { setActiveSection("Settings"); closePanel(); }}><Settings size={18} /><span><strong>Workspace settings</strong><small>Profile, storage, and preferences</small></span><ChevronRight size={17} /></button>
                      {currentUser?.uid ? (
                        <button type="button" className="account-menu-signout" onClick={onLogout}><LogOut size={18} /><span>Sign out</span></button>
                      ) : (
                        <button type="button" className="account-menu-signout" onClick={() => onNavigate(ROUTE_PATHS.login)}><LogOut size={18} /><span>Sign in</span></button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="upload-content">
          {workspaceNotice && <div className="workspace-notice">{workspaceNotice}</div>}
          {renderWorkspaceSection()}
        </div>
      </section>
    </main>
  );
}

function Inspector({
  selected,
  signatureText,
  setSignatureText,
  toolSettings,
  setToolSettings,
  updateAnnotation,
  clearSelection,
  bringSelectedToFront,
  sendSelectedToBack,
  alignSelectedCenter,
  addCustomSelectedColor,
  duplicateSelected,
  deleteSelected,
  activeTool,
  fileName,
  pages,
  annotations,
  saveState,
  saveStatusLabel,
  onSave,
  onExport,
  onShare,
  onPrint,
  onSignatureModal,
}) {
  const title = selected?.type ? selected.type[0].toUpperCase() + selected.type.slice(1) : activeTool === "signature" ? "Signature" : "Properties";
  const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState(selected?.color || colors.black);
  const [commentReplyDraft, setCommentReplyDraft] = useState("");
  const updateToolSettings = (patch) => setToolSettings?.((current) => ({ ...current, ...patch }));

  useEffect(() => {
    setCustomColorDraft(selected?.color || colors.black);
    setIsCustomColorOpen(false);
    setCommentReplyDraft("");
  }, [selected?.id]);

  return (
    <aside className="inspector">
      <div className="inspector-title">
        <span>{title}</span>
        <button type="button" onClick={clearSelection} disabled={!selected} title="Close properties">×</button>
      </div>

      {selected ? (
        <>
          {((selected.type === "text") || selected.type === "field" || selected.type === "initials" || (selected.type === "signature" && !selected.imageDataUrl)) && (
            <label className="field">
              <span>{selected.type === "field" ? "Field value" : "Content"}</span>
              <textarea value={selected.content} onChange={(event) => updateAnnotation(selected.id, { content: event.target.value })} />
            </label>
          )}

          {selected.type === "field" && selected.source === "pdf-form" && (
            <div className="document-info form-field-info">
              <span>Detected PDF form field</span>
              <strong>{selected.fieldName || "Unnamed field"}</strong>
              <small>{selected.required ? "Required field" : "Optional field"}</small>
            </div>
          )}

          {selected.type === "comment" && (
            <div className="comment-editor">
              <div className="comment-meta">
                <strong>{selected.author || "You"}</strong>
                <span className={`comment-status-pill is-${selected.status || "open"}`}>{selected.status === "resolved" ? "Resolved" : "Open"}</span>
              </div>
              <label className="field">
                <span>Comment</span>
                <textarea
                  value={selected.content}
                  onChange={(event) => updateAnnotation(selected.id, { content: event.target.value, updatedAt: nowIso() })}
                />
              </label>
              <label className="field">
                <span>Assigned to</span>
                <select value={selected.assignee || "Unassigned"} onChange={(event) => {
                  const at = nowIso();
                  updateAnnotation(selected.id, {
                    assignee: event.target.value,
                    updatedAt: at,
                    history: [...(selected.history || []), { type: "assigned", author: "You", value: event.target.value, at }],
                  });
                }}><option>Unassigned</option><option>Me</option></select>
              </label>
              <div className="comment-thread" aria-label="Comment replies">
                {(selected.replies || []).map((reply) => (
                  <article key={reply.id}>
                    <div><strong>{reply.author || "You"}</strong><span>{formatDateTime(reply.createdAt)}</span></div>
                    <p>{reply.content}</p>
                  </article>
                ))}
                {!(selected.replies || []).length && <p className="comment-thread-empty">No replies yet.</p>}
              </div>
              <label className="field comment-reply-field">
                <span>Add reply</span>
                <textarea value={commentReplyDraft} placeholder="Write a reply..." onChange={(event) => setCommentReplyDraft(event.target.value)} />
              </label>
              <div className="comment-thread-actions">
                <button type="button" disabled={!commentReplyDraft.trim()} onClick={() => {
                  const at = nowIso();
                  const reply = { id: makeId("reply"), author: "You", content: commentReplyDraft.trim(), createdAt: at };
                  updateAnnotation(selected.id, {
                    replies: [...(selected.replies || []), reply],
                    updatedAt: at,
                    history: [...(selected.history || []), { type: "replied", author: "You", at }],
                  });
                  setCommentReplyDraft("");
                }}><Send size={15} /> Reply</button>
                <button type="button" onClick={() => {
                  const nextStatus = selected.status === "resolved" ? "open" : "resolved";
                  const at = nowIso();
                  updateAnnotation(selected.id, {
                    status: nextStatus,
                    updatedAt: at,
                    history: [...(selected.history || []), { type: nextStatus, author: "You", at }],
                  });
                }}>{selected.status === "resolved" ? "Reopen" : "Resolve"}</button>
              </div>
              <small className="comment-history-summary">{(selected.history || []).length} review event{(selected.history || []).length === 1 ? "" : "s"} stored locally</small>
            </div>
          )}

          {(selected.type === "text" || selected.type === "field") && (
            <>
              <div className="field-row">
                {selected.type === "text" && <label className="field"><span>Font</span><select value={selected.fontFamily || "PP Agrandir"} onChange={(event) => updateAnnotation(selected.id, { fontFamily: event.target.value })}>{TEXT_FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>}
                <label className="field small"><span>Size</span><select value={selected.fontSize} onChange={(event) => updateAnnotation(selected.id, { fontSize: Number(event.target.value) })}>{[10, 12, 14, 16, 18, 20, 24, 32].map((size) => <option key={size}>{size}</option>)}</select></label>
              </div>
              {selected.type === "text" && (
                <>
                  <div className="field-row">
                    <label className="field"><span>Line spacing</span><select value={selected.lineHeight || 1.25} onChange={(event) => updateAnnotation(selected.id, { lineHeight: Number(event.target.value) })}>{[1, 1.15, 1.25, 1.5, 2].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                    <label className="field small"><span>Align</span><select value={selected.textAlign || "left"} onChange={(event) => updateAnnotation(selected.id, { textAlign: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                  </div>
                  <div className="format-row">
                    <button type="button" className={selected.bold ? "is-active" : ""} onClick={() => updateAnnotation(selected.id, { bold: !selected.bold })}>B</button>
                    <button type="button" className={selected.italic ? "is-active" : ""} onClick={() => updateAnnotation(selected.id, { italic: !selected.italic })}>I</button>
                    <button type="button" className={selected.underline ? "is-active" : ""} onClick={() => updateAnnotation(selected.id, { underline: !selected.underline })}>U</button>
                  </div>
                </>
              )}
            </>
          )}

          {selected.type === "signature" && !selected.imageDataUrl && (
            <div className="field-row">
              <label className="field">
                <span>Cursive font</span>
                <select value={selected.fontFamily || DEFAULT_SIGNATURE_FONT} onChange={(event) => updateAnnotation(selected.id, { fontFamily: event.target.value })}>
                  {SIGNATURE_FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                </select>
              </label>
              <label className="field small">
                <span>Size</span>
                <select value={selected.fontSize} onChange={(event) => updateAnnotation(selected.id, { fontSize: Number(event.target.value) })}>{[18, 22, 26, 30, 36, 44, 52].map((size) => <option key={size}>{size}</option>)}</select>
              </label>
            </div>
          )}

          {selected.type === "checkbox" && (
            <label className="toggle-field">
              <input type="checkbox" checked={selected.checked} onChange={(event) => updateAnnotation(selected.id, { checked: event.target.checked })} />
              <span>Checked by default</span>
            </label>
          )}

          <div className="field">
            <span>Color</span>
            <div className="swatches">
              {Object.entries(colors).filter(([name]) => selected.type !== "highlight" || name === "yellow" || name === "green" || name === "blue").map(([name, color]) => (
                <button key={name} type="button" className={selected.color === color ? "is-selected" : ""} style={{ backgroundColor: color }} onClick={() => updateAnnotation(selected.id, { color })} title={name} />
              ))}
              <button type="button" className="add-swatch" onClick={() => setIsCustomColorOpen((value) => !value)} title="Add custom color"><Plus size={16} /></button>
            </div>
            {isCustomColorOpen && (
              <div className="custom-color-row">
                <input
                  aria-label="Custom color hex"
                  value={customColorDraft}
                  onChange={(event) => setCustomColorDraft(event.target.value)}
                  placeholder="#1e63f0"
                />
                <button type="button" onClick={() => {
                  if (addCustomSelectedColor(customColorDraft)) {
                    setIsCustomColorOpen(false);
                  }
                }}>Apply</button>
              </div>
            )}
          </div>

          {(selected.type === "draw" || selected.type === "highlight" || selected.type === "whiteout" || selected.type === "rectangle" || selected.type === "circle" || selected.type === "line" || selected.type === "arrow") && (
            <label className="field">
              <span>{selected.type === "highlight" || selected.type === "whiteout" ? "Opacity" : "Stroke width"}</span>
              <input
                type="range"
                min={selected.type === "highlight" || selected.type === "whiteout" ? 20 : 1}
                max={selected.type === "highlight" || selected.type === "whiteout" ? 100 : 16}
                value={selected.type === "highlight" || selected.type === "whiteout" ? selected.opacity * 100 : selected.strokeWidth || 3}
                onChange={(event) => (
                  selected.type === "highlight" || selected.type === "whiteout"
                    ? updateAnnotation(selected.id, { opacity: Number(event.target.value) / 100 })
                    : updateAnnotation(selected.id, { strokeWidth: Number(event.target.value) })
                )}
              />
            </label>
          )}

          <label className="field">
            <span>Opacity</span>
            <input type="range" min="20" max="100" value={Math.round((selected.opacity ?? 1) * 100)} onChange={(event) => updateAnnotation(selected.id, { opacity: Number(event.target.value) / 100 })} />
          </label>

          <div className="arrange-row">
            <button type="button" onClick={bringSelectedToFront}>Front</button>
            <button type="button" onClick={sendSelectedToBack}>Back</button>
            <button type="button" onClick={alignSelectedCenter} disabled={selected.type === "draw"}>Align</button>
          </div>

          <div className="action-row">
            <button type="button" onClick={duplicateSelected} disabled={selected.type === "draw"}><FilePlus2 size={18} /> Duplicate</button>
            <button type="button" onClick={deleteSelected}><Trash2 size={18} /> Delete</button>
          </div>
        </>
      ) : (
        <div className="empty-inspector">
          <p>Select an annotation to edit its properties, or use quick actions below.</p>
          {activeTool === "draw" && (
            <div className="document-info inspector-tool-settings">
              <span>Draw tool</span>
              <strong>Pen settings</strong>
              <label className="field">
                <span>Pen color</span>
                <ColorControl value={toolSettings?.drawColor || colors.blue} onChange={(color) => updateToolSettings({ drawColor: color })} />
              </label>
              <label className="field">
                <span>Pen size</span>
                <input type="range" min="1" max="20" value={toolSettings?.drawStroke || 4} onChange={(event) => updateToolSettings({ drawStroke: Number(event.target.value) })} />
              </label>
              <div className="stroke-size-group inspector-stroke-sizes" aria-label="Pen size presets">
                {[2, 4, 8, 12, 16].map((size) => (
                  <button key={size} type="button" className={(toolSettings?.drawStroke || 4) === size ? "is-active" : ""} onClick={() => updateToolSettings({ drawStroke: size })}>
                    <span style={{ width: size + 6, height: size + 6 }} />
                    {size}px
                  </button>
                ))}
              </div>
              <small>Current pen: {toolSettings?.drawStroke || 4}px</small>
            </div>
          )}
          <div className="document-info">
            <span>Document</span>
            <strong>{fileName}</strong>
            <small>{pages.length} page{pages.length === 1 ? "" : "s"} · {annotations.length} annotation{annotations.length === 1 ? "" : "s"}</small>
            <small>Status: {saveStatusLabel || (saveState === "saving" ? "saving" : saveState)}</small>
          </div>
          <label className="field">
            <span>Signature text</span>
            <input value={signatureText} onChange={(event) => setSignatureText(event.target.value)} />
          </label>
          <button type="button" className="panel-action" onClick={onSignatureModal}><PenLine size={17} /> Create signature</button>
          <button type="button" className="panel-action" onClick={onSave}><Save size={17} /> Save document</button>
          <button type="button" className="panel-action" onClick={onExport}><Download size={17} /> Export PDF</button>
          <button type="button" className="panel-action" onClick={onShare}><Share2 size={17} /> Share</button>
          <button type="button" className="panel-action" onClick={onPrint}><Printer size={17} /> Print</button>
        </div>
      )}
    </aside>
  );
}

function DocumentSearchPanel({
  query,
  setQuery,
  results,
  activeIndex,
  onClose,
  onSelect,
}) {
  const activeResult = results[activeIndex] || null;
  const move = (direction) => {
    if (!results.length) return;
    const nextIndex = (activeIndex + direction + results.length) % results.length;
    onSelect(results[nextIndex], nextIndex);
  };

  return (
    <section className="document-search-panel" aria-label="Search document">
      <header>
        <div>
          <h3>Search document</h3>
          <span>{results.length ? `${activeIndex + 1} of ${results.length}` : query ? "No matches" : "PDF text and annotations"}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close search"><X size={16} /></button>
      </header>
      <label className="document-search-input">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find text, comments, signatures..." autoFocus />
      </label>
      <div className="document-search-actions">
        <button type="button" onClick={() => move(-1)} disabled={!results.length}>Previous</button>
        <button type="button" onClick={() => move(1)} disabled={!results.length}>Next</button>
      </div>
      <div className="document-search-results">
        {!query && <p>Search extracted PDF text plus text boxes, comments, signatures, and document name.</p>}
        {query && !results.length && <p>No matches found. Image-only PDFs need OCR before their text can be searched.</p>}
        {results.map((result, index) => (
          <button
            key={`${result.id}-${index}`}
            type="button"
            className={activeResult?.id === result.id && activeIndex === index ? "is-active" : ""}
            onClick={() => onSelect(result, index)}
          >
            <span>{result.type}</span>
            <strong>{result.title}</strong>
            <small>{result.excerpt}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function DocumentCommentsPanel({
  comments,
  selectedId,
  onClose,
  onAddComment,
  onSelect,
}) {
  const [filter, setFilter] = useState("open");
  const visibleComments = comments.filter((comment) => filter === "all" || (comment.status || "open") === filter);
  const openCount = comments.filter((comment) => (comment.status || "open") === "open").length;
  return (
    <section className="document-comments-panel" aria-label="Document comments">
      <header>
        <div>
          <h3>Comments</h3>
          <span>{comments.length ? `${openCount} open · ${comments.length - openCount} resolved` : "No comments yet"}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close comments"><X size={16} /></button>
      </header>
      <button type="button" className="comment-add-button" onClick={onAddComment}><MessageSquare size={16} /> Add comment</button>
      <div className="comment-filter-tabs" role="tablist" aria-label="Filter comments">
        {["open", "resolved", "all"].map((value) => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value}</button>)}
      </div>
      <div className="document-comment-list">
        {!visibleComments.length && (
          <p>{comments.length ? `No ${filter} comments.` : "Click Add comment, then click anywhere on the PDF to place a review note."}</p>
        )}
        {visibleComments.map((comment) => (
          <button
            key={comment.id}
            type="button"
            className={selectedId === comment.id ? "is-active" : ""}
            onClick={() => onSelect(comment)}
          >
            <span>Page {comment.page + 1} · {comment.status || "open"}</span>
            <strong>{comment.content}</strong>
            <small>{comment.author} · {(comment.replies || []).length} repl{(comment.replies || []).length === 1 ? "y" : "ies"} · {comment.assignee || "Unassigned"}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function SignatureModal({ defaultName, mode = "signature", onClose, onSave }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [tab, setTab] = useState("draw");
  const [typedName, setTypedName] = useState(defaultName || "");
  const [signatureFont, setSignatureFont] = useState(DEFAULT_SIGNATURE_FONT);
  const [uploadedImage, setUploadedImage] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState("");
  const drawingRef = useRef(false);
  const canSave = canSaveEditorSignature({ mode, tab, typedName, hasInk, uploadedImage });

  const getCanvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawStart = (event) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.01, point.y + 0.01);
    context.stroke();
    setHasInk(true);
  };

  const drawMove = (event) => {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const drawEnd = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const onUploadSignature = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setError("Choose a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Signature images must be under ${formatBytes(MAX_IMAGE_BYTES)}.`);
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result);
    reader.onerror = () => setError("The signature image could not be read.");
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    if (mode === "initials" && !typedName.trim()) {
      setError("Enter your name so FixThatPDF can create your initials.");
      return;
    }
    if (tab === "upload" && !uploadedImage) {
      setError("Upload a signature image before saving.");
      return;
    }
    if (tab === "draw" && !hasInk && mode !== "initials") {
      setError("Draw your signature before saving.");
      return;
    }
    if (tab === "type" && !typedName.trim()) {
      setError("Enter the name you want to sign with.");
      return;
    }
    if (tab === "upload") {
      onSave({ content: typedName || "Signature", imageDataUrl: uploadedImage, fontFamily: signatureFont });
      return;
    }
    if (tab === "draw" && hasInk) {
      onSave({ content: typedName || "Signature", imageDataUrl: canvasRef.current.toDataURL("image/png"), fontFamily: signatureFont });
      return;
    }
    onSave({ content: typedName.trim(), imageDataUrl: "", fontFamily: signatureFont });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title" aria-describedby="signature-modal-description">
      <section className="signature-modal">
        <header>
          <div>
            <h2 id="signature-modal-title">{mode === "initials" ? "Create initials" : "Create signature"}</h2>
            <p id="signature-modal-description">{mode === "initials" ? "Enter your name, then click the PDF page to place the initials." : "Create a signature, save it, then click the PDF page to place it."}</p>
          </div>
          <button type="button" className="modal-close" aria-label={`Close ${mode === "initials" ? "initials" : "signature"} dialog`} onClick={onClose}><X size={18} /></button>
        </header>

        {mode !== "initials" && <div className="signature-tabs" role="tablist" aria-label="Signature method">
          {["draw", "type", "upload"].map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => { setTab(item); setError(""); }}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>}

        {mode !== "initials" && tab === "draw" && (
          <div className="signature-draw-pad">
            <canvas
              ref={canvasRef}
              width="640"
              height="220"
              aria-label="Signature drawing area"
              onPointerDown={drawStart}
              onPointerMove={drawMove}
              onPointerUp={drawEnd}
              onPointerLeave={drawEnd}
            />
            <p>Draw with your pointer. Prefer typing your signature if you use a keyboard.</p>
            <button type="button" onClick={clearCanvas} disabled={!hasInk}>Clear drawing</button>
          </div>
        )}

        {(mode === "initials" || tab === "type") && (
          <label className="field signature-type">
            <span>{mode === "initials" ? "Full name" : "Name for typed signature"}</span>
            <input autoFocus value={typedName} onChange={(event) => { setTypedName(event.target.value); setError(""); }} />
            <div className="signature-font-picker">
              <span>Cursive font</span>
              <select value={signatureFont} onChange={(event) => setSignatureFont(event.target.value)}>
                {SIGNATURE_FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
            </div>
            <strong style={{ fontFamily: signatureFont }}>{mode === "initials" ? typedName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || "Initials" : typedName || "Signature"}</strong>
          </label>
        )}

        {mode !== "initials" && tab === "upload" && (
          <div className="signature-upload">
            <input ref={fileRef} className="hidden-input" type="file" accept="image/png,image/jpeg" onChange={onUploadSignature} />
            <button type="button" onClick={() => fileRef.current?.click()}><Upload size={17} /> Upload image</button>
            {uploadedImage ? <img src={uploadedImage} alt="Uploaded signature preview" /> : <p>PNG or JPG signatures work best on a transparent or white background.</p>}
          </div>
        )}

        {error && <p className="signature-modal-error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="modal-primary" disabled={!canSave} onClick={saveSignature}>Save {mode === "initials" ? "initials" : "signature"}</button>
        </footer>
      </section>
    </div>
  );
}

function ShareModal({ fileName, onClose, onExport }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Share document">
      <section className="share-modal">
        <header>
          <div>
            <h2>Share document</h2>
            <p>{fileName}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="share-panel">
          <section className="share-card">
            <div className="share-card-head">
              <Lock size={20} />
              <div>
                <h3>Secure sharing is unavailable</h3>
                <p>FixThatPDF will not generate a public document URL until a server-side token service can enforce ownership, permissions, expiration, and revocation.</p>
              </div>
            </div>
          </section>
        </div>
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Done</button>
          <button type="button" className="modal-primary" onClick={onExport}><Download size={16} /> Export PDF</button>
        </footer>
      </section>
    </div>
  );
}

function SignatureRequestModal({ fileName, onClose, onPrepare }) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState(`Please review and sign ${fileName}.`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const prepare = async () => {
    if (!recipient || !recipient.includes("@")) {
      setError("Enter a valid recipient email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onPrepare({ recipient, message });
    } catch (requestError) {
      if (requestError?.name !== "AbortError") setError("The signing copy could not be shared. Try again or export it normally.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Request signatures">
      <section className="share-modal workflow-modal">
        <header>
          <div><h2>Request a signature</h2><p>{fileName}</p></div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="workflow-modal-body">
          <p>Place signature or text fields on the page first. This creates the current PDF and hands it to your device’s share sheet; no copy is uploaded to FixThatPDF.</p>
          <label><span>Recipient email</span><input type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="name@example.com" /></label>
          <label><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows="4" /></label>
          <small>Local handoff does not provide reminders, completion tracking, identity checks, or an audit certificate.</small>
          {error && <p className="workflow-error" role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Keep editing</button>
          <button type="button" className="modal-primary" disabled={busy} onClick={prepare}><Send size={16} /> {busy ? "Preparing…" : "Prepare and share"}</button>
        </footer>
      </section>
    </div>
  );
}

function ProtectPdfModal({ fileName, onClose, onProtect }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const protect = async () => {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onProtect(password);
    } catch {
      setError("Password protection failed. Your original PDF was not changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Protect PDF">
      <section className="share-modal workflow-modal">
        <header>
          <div><h2>Protect PDF with a password</h2><p>{fileName}</p></div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="workflow-modal-body">
          <p>Real AES-256 PDF encryption runs locally in this browser. The downloaded copy will require this password to open.</p>
          <label><span>Password</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label><span>Confirm password</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <small>There is no password recovery. Save the password separately before sharing the file.</small>
          {error && <p className="workflow-error" role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="modal-primary" disabled={busy} onClick={protect}><Lock size={16} /> {busy ? "Encrypting locally…" : "Protect and download"}</button>
        </footer>
      </section>
    </div>
  );
}

function UpgradeModal({ onClose, onSelectPlan }) {
  const plans = [
    {
      name: "Free",
      price: "$0",
      detail: "For quick edits and one-off forms.",
      features: ["Edit and annotate PDFs", "Draw, sign, and export", "Local browser saves"],
      action: "Stay on Free",
    },
    {
      name: "Pro",
      price: "$12",
      detail: "For people editing and signing PDFs every week.",
      features: ["Cloud document sync", "Reusable signatures", "Share links and invite drafts", "Larger export workflows"],
      action: "Choose Pro",
      featured: true,
    },
    {
      name: "Business",
      price: "$29",
      detail: "For teams that need review, signing, and organization.",
      features: ["Workspace members", "Team templates", "Advanced signing flows", "Admin-ready storage"],
      action: "Choose Business",
    },
  ];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Upgrade workspace">
      <section className="upgrade-modal">
        <header>
          <div>
            <h2>Upgrade workspace</h2>
            <p>Choose the workflow level that matches how often you edit, sign, share, and store PDFs.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="upgrade-plan-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={plan.featured ? "is-featured" : ""}>
              <span>{plan.name}</span>
              <strong>{plan.price}<small>{plan.name === "Free" ? "" : "/mo"}</small></strong>
              <p>{plan.detail}</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={15} /> {feature}</li>)}
              </ul>
              <button type="button" onClick={() => onSelectPlan(plan.name)}>{plan.action}</button>
            </article>
          ))}
        </div>

        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Not now</button>
          <button type="button" className="modal-primary" onClick={() => onSelectPlan("Pro")}>Continue with Pro</button>
        </footer>
      </section>
    </div>
  );
}

async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  Array.from({ length: 3 }).forEach((_, pageIndex) => {
    const page = pdfDoc.addPage([612, 792]);
    page.drawText(pageIndex === 0 ? "SERVICE AGREEMENT" : pageIndex === 1 ? "STATEMENT OF WORK" : "EXHIBIT B", {
      x: 202,
      y: 710,
      size: 18,
      font: bold,
      color: rgb(0.07, 0.09, 0.14),
    });
    const lines = [
      "This Service Agreement is made and entered into as of May 15, 2024.",
      "Client: Acme Corporation, 123 Business Way, Suite 100, Austin, TX.",
      "Provider: Northfield Solutions, LLC, 500 Innovation Drive, Austin, TX.",
      "",
      "1. SCOPE OF SERVICES",
      "Provider agrees to perform the services described in Exhibit A.",
      "2. TERM",
      "This Agreement shall continue for twelve months unless terminated earlier.",
      "3. PAYMENT TERMS",
      "Client shall pay Provider the fees set forth in Exhibit B.",
      "4. CONFIDENTIALITY",
      "Each Party agrees to keep non-public information confidential.",
    ];
    lines.forEach((line, index) => {
      page.drawText(line, { x: 72, y: 662 - index * 24, size: line.match(/^\d/) ? 12 : 10.5, font: line.match(/^\d/) ? bold : font, color: rgb(0.08, 0.1, 0.16) });
    });
  });

  return pdfDoc;
}

async function createBlankPdf(pageCount) {
  const pdfDoc = await PDFDocument.create();
  Array.from({ length: Math.max(1, pageCount) }).forEach(() => {
    pdfDoc.addPage([612, 792]);
  });
  return pdfDoc;
}
