import { useEffect, useMemo, useRef, useState } from "react";
import ArrowDownToLine from "lucide-react/dist/esm/icons/arrow-down-to-line.mjs";
import Bell from "lucide-react/dist/esm/icons/bell.mjs";
import Box from "lucide-react/dist/esm/icons/box.mjs";
import Building2 from "lucide-react/dist/esm/icons/building-2.mjs";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import CheckSquare from "lucide-react/dist/esm/icons/check-square.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.mjs";
import Copy from "lucide-react/dist/esm/icons/copy.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import EllipsisVertical from "lucide-react/dist/esm/icons/ellipsis-vertical.mjs";
import Eraser from "lucide-react/dist/esm/icons/eraser.mjs";
import FilePlus2 from "lucide-react/dist/esm/icons/file-plus-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus.mjs";
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
import PenLine from "lucide-react/dist/esm/icons/pen-line.mjs";
import Printer from "lucide-react/dist/esm/icons/printer.mjs";
import Plus from "lucide-react/dist/esm/icons/plus.mjs";
import Redo2 from "lucide-react/dist/esm/icons/redo-2.mjs";
import Save from "lucide-react/dist/esm/icons/save.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import Settings from "lucide-react/dist/esm/icons/settings.mjs";
import Share2 from "lucide-react/dist/esm/icons/share-2.mjs";
import Link from "lucide-react/dist/esm/icons/link.mjs";
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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const BASE_PAGE_WIDTH = 760;
const BASE_PAGE_HEIGHT = 984;
const EDITOR_PAGE_SCALE = 0.74;
const APP_NAME = "CosmicPDF";
const STORAGE_KEY = "paperflow.documents.v1";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
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

const toolConfig = [
  { id: "select", label: "Select", icon: MousePointer2 },
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

function safeLoadDocuments() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDocuments(documents) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
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
  anchor.click();
  URL.revokeObjectURL(url);
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
  const rect = pageElement.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
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

function Annotation({ annotation, selected, zoom, onSelect, onDrag, onResize, onUpdate, onDelete }) {
  const textContentRef = useRef(null);
  const textWasFocusedRef = useRef(false);
  const displayScale = (zoom / 100) * EDITOR_PAGE_SCALE;
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

  if (annotation.type === "draw") {
    const points = annotation.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
    const normalizedStrokeWidth = Math.max(0.15, (annotation.strokeWidth / BASE_PAGE_WIDTH) * 100);
    return (
      <svg className={`ink-layer ${selected ? "is-selected" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={(event) => { event.stopPropagation(); onSelect(annotation.id); }}>
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
      <div className={`annotation checkbox-field ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, "--checkbox-color": annotation.color }} onPointerDown={dragStart}>
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
      <div className={`annotation signature ${annotation.type === "initials" ? "initials" : ""} ${selected ? "is-selected" : ""}`} style={{ ...commonStyle, color: annotation.color, fontSize: `${annotation.fontSize * displayScale}px` }} onPointerDown={dragStart}>
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
        <span>{annotation.content || "Text field"}</span>
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
        fontSize: `${annotation.fontSize * displayScale}px`,
        fontWeight: annotation.bold ? 700 : 500,
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
      <div
        ref={textContentRef}
        className="text-content"
        contentEditable={selected}
        suppressContentEditableWarning
        spellCheck="false"
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(annotation.id);
        }}
        onBlur={(event) => onUpdate(annotation.id, { content: event.currentTarget.innerText || " " })}
        onInput={(event) => onUpdate(annotation.id, { content: event.currentTarget.innerText || " " })}
      >
        {annotation.content}
      </div>
      {selected && <span className="resize-handle" onPointerDown={resizeStart} />}
    </div>
  );
}

export function App() {
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const zoomMenuRef = useRef(null);
  const canvasColumnRef = useRef(null);
  const lastPagePointRef = useRef({ x: 0.52, y: 0.28 });
  const [screen, setScreen] = useState(() => (
    new URLSearchParams(window.location.search).get("view") === "dashboard" ? "upload" : "landing"
  ));
  const [authMode, setAuthMode] = useState("signup");
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState(() => safeLoadDocuments());
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [pages, setPages] = useState([]);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState("New Document");
  const [tool, setTool] = useState("select");
  const [pageIndex, setPageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(80);
  const [saved, setSaved] = useState(true);
  const [saveState, setSaveState] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [draft, setDraft] = useState(null);
  const [signatureText, setSignatureText] = useState("Jane Smith");
  const [viewMode, setViewMode] = useState("list");
  const [isExporting, setIsExporting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadStage, setUploadStage] = useState({ status: "idle", percent: 0, fileName: "" });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState("");
  const [isPagesCollapsed, setIsPagesCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activeSignature, setActiveSignature] = useState({ content: "Jane Smith", imageDataUrl: "" });
  const [pendingImage, setPendingImage] = useState(null);
  const [toolSettings, setToolSettings] = useState({
    textColor: colors.black,
    textSize: 16,
    fontFamily: "PP Agrandir",
    textAlign: "left",
    lineHeight: 1.25,
    drawColor: colors.blue,
    drawStroke: 4,
    highlightColor: colors.yellow,
    highlightOpacity: 0.62,
    shapeColor: colors.blue,
    shapeStroke: 3,
    whiteoutOpacity: 1,
  });

  const selected = useMemo(() => annotations.find((annotation) => annotation.id === selectedId), [annotations, selectedId]);
  const activeDocument = useMemo(() => documents.find((document) => document.id === activeDocumentId), [documents, activeDocumentId]);
  const currentPage = pages[pageIndex] || pages[0];
  const pageAnnotations = annotations.filter((annotation) => annotation.page === pageIndex);
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

    const fileMatch = fileName.toLowerCase().includes(query)
      ? [{ id: "file-name", type: "Document", page: 0, title: fileName, excerpt: `Document name: ${fileName}` }]
      : [];

    return [...fileMatch, ...pageMatches, ...annotationMatches].sort((a, b) => a.page - b.page);
  }, [annotations, documentSearchQuery, fileName, pages]);
  const commentResults = useMemo(() => (
    annotations
      .filter((annotation) => annotation.type === "comment")
      .map((annotation) => ({
        id: annotation.id,
        page: annotation.page,
        content: annotation.content || "Add a comment",
        author: annotation.author || "You",
        updatedAt: annotation.updatedAt,
      }))
      .sort((a, b) => a.page - b.page)
  ), [annotations]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const replaceDocuments = (nextDocuments) => {
    try {
      writeDocuments(nextDocuments);
      setDocuments(nextDocuments);
      return true;
    } catch {
      setDocuments(nextDocuments);
      setUploadError("This browser storage is full. The document is open, but it may not persist after refresh.");
      return false;
    }
  };

  const openAuth = (mode = "signup") => {
    setAuthMode(mode);
    setScreen("auth");
  };

  const completeAuth = ({ email, name }) => {
    setCurrentUser({ email, name: name || email?.split("@")[0] || "Workspace owner" });
    setScreen("upload");
  };

  const upsertDocument = (document) => {
    const nextDocuments = [document, ...documents.filter((item) => item.id !== document.id)];
    replaceDocuments(nextDocuments);
  };

  const markUnsaved = () => {
    setSaved(false);
    setSaveState("unsaved");
  };

  const saveActiveDocument = (immediate = false) => {
    if (!activeDocumentId) return;
    const stamp = nowIso();
    setSaveState(immediate ? "saved" : "saving");
    const nextDocuments = documents.map((document) => (
      document.id === activeDocumentId
        ? {
          ...document,
          name: fileName,
          pages,
          annotations,
          pageCount: pages.length,
          updatedAt: stamp,
        }
        : document
    ));
    replaceDocuments(nextDocuments);
    setLastSavedAt(stamp);
    setSaved(true);
    window.setTimeout(() => setSaveState("saved"), immediate ? 0 : 180);
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
    };

    upsertDocument(duplicateRecord);
    setActiveDocumentId(duplicateRecord.id);
    setFileName(nextName);
    setPages(clonedPages);
    setAnnotations(clonedAnnotations);
    setSelectedId(null);
    setUndoStack([]);
    setRedoStack([]);
    setPageIndex(0);
    setSaved(true);
    setSaveState("saved");
    setLastSavedAt(stamp);
    showToast("Document duplicated.");
  };

  const commitAnnotations = (next) => {
    setUndoStack((stack) => [...stack.slice(-24), annotations]);
    setRedoStack([]);
    setAnnotations(next);
    markUnsaved();
  };

  const updateAnnotation = (id, patch) => {
    setAnnotations((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    markUnsaved();
  };

  const addAnnotation = (annotation) => {
    commitAnnotations([...annotations, annotation]);
    setSelectedId(annotation.id);
    setTool("select");
  };

  const goToSearchResult = (result, index = activeSearchIndex) => {
    if (!result) return;
    setActiveSearchIndex(index);
    setPageIndex(clamp(result.page, 0, Math.max(0, pages.length - 1)));
    setSelectedId(result.annotationId || null);
    if (result.annotationId) {
      setIsInspectorCollapsed(false);
    }
    setTool("select");
  };

  const goToComment = (comment) => {
    if (!comment) return;
    setPageIndex(clamp(comment.page, 0, Math.max(0, pages.length - 1)));
    setSelectedId(comment.id);
    setIsInspectorCollapsed(false);
    setTool("select");
  };

  const addTextAnnotation = (content, point) => {
    const isBlankInsertion = !content.trim();
    const cleanContent = isBlankInsertion ? " " : content.trimEnd();
    const lines = cleanContent.split("\n");
    const longestLine = Math.max(...lines.map((line) => line.length), isBlankInsertion ? 1 : 9);
    const width = isBlankInsertion ? 0.042 : clamp(longestLine * 0.0095, 0.11, 0.42);
    const height = isBlankInsertion ? 0.052 : clamp(lines.length * 0.028 + 0.026, 0.052, 0.28);

    addAnnotation({
      id: makeId("text"),
      type: "text",
      page: pageIndex,
      x: clamp(point.x, 0.02, 0.96 - width),
      y: clamp(point.y, 0.02, 0.97 - height),
      w: width,
      h: height,
      content: cleanContent,
      color: toolSettings.textColor,
      fontSize: toolSettings.textSize,
      fontFamily: toolSettings.fontFamily,
      textAlign: toolSettings.textAlign,
      lineHeight: toolSettings.lineHeight,
      bold: false,
      italic: false,
      underline: false,
      opacity: 1,
    });
  };

  useEffect(() => {
    if (!pages.length) return undefined;

    const onPaste = (event) => {
      const target = event.target;
      if (target?.closest?.("textarea, input, select, [contenteditable='true']")) return;

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
  }, [annotations, fileName, pages, activeDocumentId, saveState]);

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

  const loadPdfFile = async (file) => {
    if (!file) return;
    setUploadStage({ status: "validating", percent: 8, fileName: file.name });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file.");
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`For this local MVP, PDFs must be under ${formatBytes(MAX_FILE_BYTES)}.`);
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
      return;
    }

    try {
      setUploadError("");
      setUploadStage({ status: "reading", percent: 18, fileName: file.name });
      const buffer = await file.arrayBuffer();
      const document = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      const loadedPages = [];

      for (let index = 1; index <= document.numPages; index += 1) {
        setUploadStage({
          status: `Rendering page ${index} of ${document.numPages}`,
          percent: Math.round(24 + (index / document.numPages) * 56),
          fileName: file.name,
        });
        const page = await document.getPage(index);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const displayWidth = BASE_PAGE_WIDTH;
        const displayHeight = Math.round(BASE_PAGE_WIDTH * (viewport.height / viewport.width));
        loadedPages.push({
          id: makeId("page"),
          number: index,
          originalIndex: index - 1,
          width: displayWidth,
          height: displayHeight,
          image: canvas.toDataURL("image/png"),
          text: pageText,
          source: "pdf",
        });
      }

      setUploadStage({ status: "Saving workspace copy", percent: 88, fileName: file.name });
      const stamp = nowIso();
      const documentRecord = {
        id: makeId("doc"),
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
        annotations: [],
      };

      upsertDocument(documentRecord);
      setActiveDocumentId(documentRecord.id);
      setPages(loadedPages);
      setPdfBytes(buffer);
      setFileName(file.name);
      setPageIndex(0);
      setAnnotations([]);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedId(null);
      setTool("select");
      setScreen("editor");
      setSaved(true);
      setSaveState("saved");
      setLastSavedAt(stamp);
      setUploadStage({ status: "complete", percent: 100, fileName: file.name });
      showToast("Document uploaded and saved locally.");
      window.setTimeout(() => setUploadStage({ status: "idle", percent: 0, fileName: "" }), 900);
    } catch {
      setUploadError("We could not read that PDF. Try a smaller or unprotected PDF file.");
      setUploadStage({ status: "error", percent: 0, fileName: file.name });
    }
  };

  const onUpload = async (event) => {
    await loadPdfFile(event.target.files?.[0]);
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

  const startBlankDocument = () => {
    const stamp = nowIso();
    const blankPages = [{ id: makeId("blank-page"), number: 1, originalIndex: null, width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT, source: "blank" }];
    const documentRecord = {
      id: makeId("doc"),
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
    };

    upsertDocument(documentRecord);
    setActiveDocumentId(documentRecord.id);
    setPages(blankPages);
    setPdfBytes(null);
    setFileName("Untitled blank document.pdf");
    setPageIndex(0);
    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setTool("text");
    setScreen("editor");
    setSaved(true);
    setSaveState("saved");
    setLastSavedAt(stamp);
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
    setPages((items) => [...items.slice(0, insertionIndex), blankPage, ...items.slice(insertionIndex)].map((page, index) => ({ ...page, number: index + 1 })));
    setAnnotations((items) => items.map((annotation) => (annotation.page >= insertionIndex ? { ...annotation, page: annotation.page + 1 } : annotation)));
    setPageIndex(insertionIndex);
    markUnsaved();
    showToast("Blank page added.");
  };

  const deleteCurrentPage = () => {
    if (pages.length <= 1) {
      showToast("A document needs at least one page.");
      return;
    }
    const removedIndex = pageIndex;
    setPages((items) => items.filter((_, index) => index !== removedIndex).map((page, index) => ({ ...page, number: index + 1 })));
    setAnnotations((items) => items
      .filter((annotation) => annotation.page !== removedIndex)
      .map((annotation) => (annotation.page > removedIndex ? { ...annotation, page: annotation.page - 1 } : annotation)));
    setSelectedId(null);
    setPageIndex((value) => clamp(value, 0, pages.length - 2));
    markUnsaved();
    showToast("Page deleted.");
  };

  const moveCurrentPage = (direction) => {
    const nextIndex = pageIndex + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    setPages((items) => {
      const next = [...items];
      [next[pageIndex], next[nextIndex]] = [next[nextIndex], next[pageIndex]];
      return next.map((page, index) => ({ ...page, number: index + 1 }));
    });
    setAnnotations((items) => items.map((annotation) => {
      if (annotation.page === pageIndex) return { ...annotation, page: nextIndex };
      if (annotation.page === nextIndex) return { ...annotation, page: pageIndex };
      return annotation;
    }));
    setPageIndex(nextIndex);
    markUnsaved();
  };

  const openDocument = async (documentRecord) => {
    setActiveDocumentId(documentRecord.id);
    setPages((documentRecord.pages || []).map((page, index) => ({
      ...page,
      number: index + 1,
      originalIndex: page.source === "pdf" && page.originalIndex == null ? index : page.originalIndex,
    })));
    setAnnotations(documentRecord.annotations || []);
    setPdfBytes(documentRecord.pdfDataUrl ? await dataUrlToArrayBuffer(documentRecord.pdfDataUrl) : null);
    setFileName(documentRecord.name);
    setPageIndex(0);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setTool("select");
    setScreen("editor");
    setSaved(true);
    setSaveState("saved");
    setLastSavedAt(documentRecord.updatedAt);
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
    replaceDocuments(documents.filter((item) => item.id !== documentRecord.id));
    if (activeDocumentId === documentRecord.id) {
      setActiveDocumentId(null);
      setPages([]);
      setAnnotations([]);
      setPdfBytes(null);
      setScreen("upload");
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
    event.currentTarget.focus();
    lastPagePointRef.current = pointerToNormalized(event, event.currentTarget);
    if (!["text", "highlight", "draw", "signature", "initials", "checkbox", "field", "date", "whiteout", "rectangle", "circle", "line", "arrow", "comment", "image"].includes(tool)) {
      setSelectedId(null);
      return;
    }
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
        content: "Text field",
        color: colors.blue,
        fontSize: 12,
        opacity: 1,
      });
      return;
    }

    if (tool === "signature") {
      if (!activeSignature.content && !activeSignature.imageDataUrl) {
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
        opacity: 1,
      });
      return;
    }

    if (tool === "initials") {
      addAnnotation({
        id: makeId("initials"),
        type: "initials",
        page: pageIndex,
        x: clamp(point.x, 0, 0.86),
        y: clamp(point.y, 0, 0.94),
        w: 0.12,
        h: 0.055,
        content: (signatureText || "JS").split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || "JS",
        color: "#0f172a",
        fontSize: 24,
        opacity: 1,
      });
      return;
    }

    if (tool === "comment") {
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
        updatedAt: nowIso(),
        color: "#f59e0b",
        opacity: 1,
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
    setTool("select");
  };

  const undo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [annotations, ...stack].slice(0, 25));
    setUndoStack((stack) => stack.slice(0, -1));
    setAnnotations(previous);
    setSelectedId(null);
    markUnsaved();
  };

  const redo = () => {
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    setUndoStack((stack) => [...stack, annotations].slice(-25));
    setRedoStack(rest);
    setAnnotations(next);
    markUnsaved();
  };

  const duplicateSelected = () => {
    if (!selected || selected.type === "draw") return;
    addAnnotation({ ...selected, id: makeId(selected.type), x: clamp(selected.x + 0.025, 0, 0.86), y: clamp(selected.y + 0.025, 0, 0.94) });
  };

  const deleteSelected = () => {
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
      setZoom(80);
      return;
    }
    const nextZoom = Math.round((availableWidth / (currentPage.width * EDITOR_PAGE_SCALE)) * 100);
    setZoom(clamp(nextZoom, 60, 160));
    showToast("Fit page to width.");
  };

  useEffect(() => {
    if (!pages.length) return undefined;

    const isEditingText = (target) => target?.closest?.("textarea, input, select, [contenteditable='true']");
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "s") {
        event.preventDefault();
        saveActiveDocument(true);
        showToast("Saved locally.");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "f") {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (isEditingText(event.target)) return;
      if (!event.metaKey && !event.ctrlKey && !event.altKey && selected?.type === "text" && key.length === 1) return;

      if (key === "escape") {
        setSelectedId(null);
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
      if ((key === "backspace" || key === "delete") && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pages.length, selectedId, selected?.type, annotations, saveState]);

  const exportPdf = async () => {
    setIsExporting(true);
    try {
    saveActiveDocument(true);
    const pdfDoc = await PDFDocument.create();
    const sourcePdf = pdfBytes ? await PDFDocument.load(pdfBytes) : null;

    for (const pageRecord of pages) {
      if (sourcePdf && pageRecord.source === "pdf" && Number.isInteger(pageRecord.originalIndex)) {
        const [copiedPage] = await pdfDoc.copyPages(sourcePdf, [pageRecord.originalIndex]);
        pdfDoc.addPage(copiedPage);
      } else {
        pdfDoc.addPage([612, Math.round(612 * ((pageRecord.height || BASE_PAGE_HEIGHT) / (pageRecord.width || BASE_PAGE_WIDTH)))]);
      }
    }

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    for (const annotation of annotations) {
      const page = pdfDoc.getPages()[annotation.page];
      if (!page) continue;
      const { width, height } = page.getSize();
      const color = hexToRgb(annotation.color || colors.black);

      if (annotation.type === "highlight") {
        page.drawRectangle({
          x: annotation.x * width,
          y: height - annotation.y * height - annotation.h * height,
          width: annotation.w * width,
          height: annotation.h * height,
          color,
          opacity: annotation.opacity,
          borderOpacity: 0,
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
        });
      }

      if (annotation.type === "checkbox") {
        const boxSize = Math.min(annotation.w * width, annotation.h * height);
        const x = annotation.x * width;
        const y = height - annotation.y * height - boxSize;
        page.drawRectangle({
          x,
          y,
          width: boxSize,
          height: boxSize,
          borderColor: color,
          borderWidth: 1.5,
          color: rgb(1, 1, 1),
          opacity: annotation.opacity,
        });
        if (annotation.checked) {
          page.drawLine({ start: { x: x + boxSize * 0.22, y: y + boxSize * 0.48 }, end: { x: x + boxSize * 0.42, y: y + boxSize * 0.25 }, thickness: 2, color });
          page.drawLine({ start: { x: x + boxSize * 0.42, y: y + boxSize * 0.25 }, end: { x: x + boxSize * 0.78, y: y + boxSize * 0.76 }, thickness: 2, color });
        }
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
        const start = { x: annotation.x * width, y: height - annotation.y * height };
        const end = { x: (annotation.x + annotation.w) * width, y: height - (annotation.y + annotation.h) * height };
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
      }

      if (annotation.type === "field") {
        const x = annotation.x * width;
        const y = height - annotation.y * height - annotation.h * height;
        page.drawRectangle({
          x,
          y,
          width: annotation.w * width,
          height: annotation.h * height,
          borderColor: color,
          borderWidth: 1.2,
          opacity: annotation.opacity,
        });
        page.drawText(annotation.content || "Text field", {
          x: x + 8,
          y: y + Math.max(8, annotation.h * height * 0.32),
          size: annotation.fontSize || 11,
          font: helvetica,
          color,
          opacity: Math.min(0.82, annotation.opacity ?? 1),
        });
      }

      if (annotation.type === "text") {
        const lines = annotation.content.split("\n");
        lines.forEach((line, index) => {
          const font = annotation.bold ? helveticaBold : annotation.fontFamily === "Times New Roman" ? timesItalic : helvetica;
          const textWidth = font.widthOfTextAtSize(line, annotation.fontSize);
          const boxWidth = annotation.w * width;
          const alignOffset = annotation.textAlign === "center" ? Math.max(0, (boxWidth - textWidth) / 2) : annotation.textAlign === "right" ? Math.max(0, boxWidth - textWidth - 8) : 0;
          page.drawText(line, {
            x: annotation.x * width + 8 + alignOffset,
            y: height - annotation.y * height - 22 - index * (annotation.fontSize * (annotation.lineHeight || 1.25)),
            size: annotation.fontSize,
            font,
            color,
            opacity: annotation.opacity,
          });
        });
      }

      if (annotation.type === "signature" || annotation.type === "initials") {
        if (annotation.imageDataUrl) {
          const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
          if (image) {
            page.drawImage(image, {
              x: annotation.x * width,
              y: height - annotation.y * height - annotation.h * height,
              width: annotation.w * width,
              height: annotation.h * height,
              opacity: annotation.opacity,
            });
          }
        } else {
          page.drawText(annotation.content, {
            x: annotation.x * width + 6,
            y: height - annotation.y * height - annotation.h * height + 7,
            size: annotation.fontSize,
            font: timesItalic,
            color,
            opacity: annotation.opacity,
          });
        }
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
          });
        }
      }

      if (annotation.type === "draw") {
        annotation.points.slice(1).forEach((point, index) => {
          const previous = annotation.points[index];
          page.drawLine({
            start: { x: previous.x * width, y: height - previous.y * height },
            end: { x: point.x * width, y: height - point.y * height },
            thickness: annotation.strokeWidth,
            color,
            opacity: annotation.opacity,
          });
        });
      }
    }

    const bytes = await pdfDoc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), fileName.replace(/\.pdf$/i, "") + "-edited.pdf");
    setSaved(true);
    setSaveState("saved");
    showToast("Exported PDF with current edits.");
    } catch {
      showToast("Export failed. Try saving locally, then export again.");
    } finally {
    setIsExporting(false);
    }
  };

  if (!pages.length && screen === "landing") {
    return (
      <LandingPage
        fileInputRef={fileInputRef}
        onUpload={onUpload}
        onStart={() => (currentUser ? setScreen("upload") : openAuth("signup"))}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup")}
        onSelectFiles={() => (currentUser ? fileInputRef.current?.click() : openAuth("signup"))}
        onBlankPage={startBlankDocument}
        documentCount={documents.length}
      />
    );
  }

  if (!pages.length && screen === "auth") {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onBack={() => setScreen("landing")}
        onComplete={completeAuth}
      />
    );
  }

  if (!pages.length) {
    return (
      <UploadLanding
        fileInputRef={fileInputRef}
        onUpload={onUpload}
        onSelectFiles={() => fileInputRef.current?.click()}
        onDropFile={onDropFile}
        onBlankPage={startBlankDocument}
        uploadError={uploadError}
        uploadStage={uploadStage}
        isDraggingFile={isDraggingFile}
        setIsDraggingFile={setIsDraggingFile}
        onBackToLanding={() => setScreen("landing")}
        documents={documents}
        onOpenDocument={openDocument}
        onRenameDocument={renameDocument}
        onDeleteDocument={deleteDocument}
        onDuplicateDocument={duplicateDocument}
        onDownloadDocument={downloadStoredDocument}
        onToggleFavorite={toggleDocumentFavorite}
        onMoveDocument={moveDocument}
      />
    );
  }

  return (
    <main className="editor-shell">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <input ref={imageInputRef} className="hidden-input" type="file" accept="image/png,image/jpeg" onChange={onImageUpload} />
      <header className="file-header">
        <button type="button" className="lumin-menu-button" onClick={() => {
          saveActiveDocument(true);
          setPages([]);
          setScreen("upload");
        }} title="Back to dashboard"><List size={28} /></button>
        <div className="file-meta">
          <button type="button" className="file-name" onClick={renameActiveDocument} title="Rename document">{fileName}<PenLine size={16} /></button>
          <div className={`save-state ${saveState}`}>
            <Info size={16} />
            {saveState === "saving" ? "Saving..." : saved ? "Edited just now" : "Unsaved changes"}
          </div>
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
                  renameActiveDocument();
                  setIsMoreMenuOpen(false);
                }}><PenLine size={16} /> Rename document</button>
                <button type="button" role="menuitem" onClick={() => {
                  duplicateActiveDocument();
                  setIsMoreMenuOpen(false);
                }}><FilePlus2 size={16} /> Duplicate document</button>
                <button type="button" role="menuitem" onClick={() => {
                  saveActiveDocument(true);
                  showToast("Saved locally.");
                  setIsMoreMenuOpen(false);
                }}><Save size={16} /> Save locally</button>
                <span />
                <button type="button" role="menuitem" onClick={() => {
                  addBlankPage();
                  setIsMoreMenuOpen(false);
                }}><Plus size={16} /> Add blank page</button>
                <button type="button" role="menuitem" onClick={() => {
                  setShareModalOpen(true);
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
          <button type="button" className="icon-button" onClick={undo} disabled={!undoStack.length} title="Undo"><Undo2 size={20} /></button>
          <button type="button" className="icon-button" onClick={redo} disabled={!redoStack.length} title="Redo"><Redo2 size={20} /></button>
          <span className="header-divider" />
          <button type="button" className="share-button" onClick={() => setShareModalOpen(true)} title="Share"><Share2 size={19} /> Share <ChevronDown size={18} /></button>
          <button type="button" className="icon-button" onClick={() => {
            saveActiveDocument(true);
            showToast("Saved locally.");
          }} title="Save"><Save size={18} /> Save</button>
          <button type="button" className="sign-secure-button" onClick={() => setSignatureModalOpen(true)} title="Create signature"><PenLine size={19} /> Sign securely <ChevronDown size={18} /></button>
          <button type="button" className="icon-button" onClick={() => window.print()} title="Print"><Printer size={19} /></button>
          <button type="button" className="download-button" onClick={exportPdf} disabled={isExporting}><Download size={18} /> {isExporting ? "Exporting" : "Download"}</button>
          <div className="top-avatar editor-avatar">WD</div>
        </div>
      </header>

      <section className="tool-ribbon">
        <button className="toolbar-icon" type="button" onClick={() => setIsPagesCollapsed((value) => !value)} title="Pages"><FileText size={25} /><ChevronDown size={15} /></button>
        <span className="toolbar-separator" />
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
            {zoom}% <ChevronDown size={14} />
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
        <span className="toolbar-separator" />
        <button className="ribbon-tool" type="button" onClick={() => fileInputRef.current?.click()} title="Upload" aria-label="Upload"><Upload size={24} /></button>
        <div className="ribbon-divider" />
        {toolConfig.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            className={`ribbon-tool ${tool === id ? "is-active" : ""}`}
            onClick={() => {
              if (id === "signature" && !activeSignature.content && !activeSignature.imageDataUrl) {
                setSignatureModalOpen(true);
              }
              if (id === "image") {
                imageInputRef.current?.click();
                showToast(pendingImage ? "Click the page to place the selected image." : "Choose a PNG or JPG to insert.");
              }
              setTool(id);
            }}
          >
            <Icon size={25} />
          </button>
        ))}
        <div className="ribbon-divider" />
        <button className="ribbon-tool" type="button" onClick={undo} disabled={!undoStack.length} title="Undo" aria-label="Undo"><Undo2 size={24} /></button>
        <button className="ribbon-tool is-muted" type="button" onClick={redo} disabled={!redoStack.length} title="Redo" aria-label="Redo"><Redo2 size={24} /></button>
        <div className="ribbon-divider" />
        <button className="ribbon-tool" type="button" onClick={() => setIsZoomMenuOpen(true)} title="Zoom presets" aria-label="Zoom presets"><Search size={24} /></button>
        <button className="ribbon-tool" type="button" onClick={fitPageToWidth} title="Fit width" aria-label="Fit width"><ArrowDownToLine size={24} /></button>
        <ToolSettingsPanel tool={tool} settings={toolSettings} setSettings={setToolSettings} />
      </section>

      <section className="workspace">
        <aside className="lumin-editor-rail">
          {[
            { label: "Popular", icon: FileText, active: true },
            { label: "Fill & Sign", icon: PenLine },
            { label: "Mark up", icon: MessageSquare },
            { label: "Edit text", icon: Type },
            { label: "Security", icon: CheckCircle2 },
            { label: "Organize", icon: FilePlus2 },
            { label: "Explore", icon: Grid2X2 },
          ].map(({ label, icon: Icon, active }) => (
            <button key={label} type="button" className={active ? "is-active" : ""} onClick={() => {
              if (label === "Fill & Sign") setTool("signature");
              if (label === "Mark up") setTool("comment");
              if (label === "Edit text") setTool("text");
              if (label === "Organize") setIsPagesCollapsed(false);
            }}>
              <Icon size={28} />
              <span>{label}</span>
            </button>
          ))}
        </aside>
        <aside className={`pages-panel ${isPagesCollapsed ? "is-collapsed" : ""}`}>
          <div className="panel-title">
            <span>Pages</span>
            <div>
              <button type="button" title={isPagesCollapsed ? "Expand pages" : "Collapse pages"} onClick={() => setIsPagesCollapsed((value) => !value)}>{isPagesCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
              <button type="button" title="Grid view" onClick={() => setViewMode("grid")}><Grid2X2 size={16} /></button>
              <button type="button" title="List view" onClick={() => setViewMode("list")}><List size={16} /></button>
            </div>
          </div>
          <div className="page-actions">
            <button type="button" onClick={addBlankPage}><Plus size={15} /> Add</button>
            <button type="button" onClick={() => moveCurrentPage(-1)} disabled={pageIndex === 0}><GripVertical size={15} /> Up</button>
            <button type="button" onClick={() => moveCurrentPage(1)} disabled={pageIndex === pages.length - 1}><GripVertical size={15} /> Down</button>
            <button type="button" onClick={deleteCurrentPage} disabled={pages.length <= 1}><Trash2 size={15} /> Delete</button>
          </div>
          <div className={`thumbnail-list ${viewMode}`}>
            {pages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                className={`thumbnail ${pageIndex === index ? "is-selected" : ""}`}
                aria-current={pageIndex === index ? "page" : undefined}
                title={`Page ${index + 1}`}
                onClick={() => setPageIndex(index)}
              >
                <div className="thumbnail-preview">
                  <div className="thumb-page">
                    {page.image ? <img src={page.image} alt={`Page ${index + 1}`} /> : page.source === "blank" ? <BlankDocument /> : <SampleDocument pageIndex={index} />}
                  </div>
                </div>
                <span className="thumbnail-label">Page {index + 1}</span>
              </button>
            ))}
          </div>
          <div className="saved-foot"><CheckCircle2 size={22} /> Document is {saved ? "saved" : "not saved"}</div>
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
              <div className="annotation-layer">
                {pageAnnotations.map((annotation) => (
                  <Annotation
                    key={annotation.id}
                    annotation={annotation}
                    selected={annotation.id === selectedId}
                    zoom={zoom}
                    onSelect={setSelectedId}
                    onDrag={(id, patch) => updateAnnotation(id, { x: clamp(patch.x, 0, 0.95), y: clamp(patch.y, 0, 0.96) })}
                    onResize={(id, patch) => updateAnnotation(id, { w: clamp(patch.w, 0.03, 0.7), h: clamp(patch.h, 0.018, 0.45) })}
                    onUpdate={updateAnnotation}
                    onDelete={(id) => {
                      commitAnnotations(annotations.filter((item) => item.id !== id));
                      setSelectedId(null);
                    }}
                  />
                ))}
                {draft && draft.page === pageIndex && draft.type === "draw" && (
                  <svg className="ink-layer drafting" viewBox="0 0 100 100" preserveAspectRatio="none">
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
              fileName={fileName}
              pages={pages}
              annotations={annotations}
              saveState={saveState}
              onSave={() => {
                saveActiveDocument(true);
                showToast("Saved locally.");
              }}
              onExport={exportPdf}
              onShare={() => setShareModalOpen(true)}
              onPrint={() => window.print()}
              onSignatureModal={() => setSignatureModalOpen(true)}
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
          <button type="button" title="Share link" onClick={() => setShareModalOpen(true)}><Share2 size={25} /></button>
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
        <div className="page-nav">
          <button type="button" onClick={() => setPageIndex(0)}>‹</button>
          <input value={pageIndex + 1} onChange={(event) => setPageIndex(clamp(Number(event.target.value) - 1 || 0, 0, pages.length - 1))} />
          <span>/ {pages.length}</span>
          <button type="button" onClick={() => setPageIndex((value) => clamp(value - 1, 0, pages.length - 1))}>⌃</button>
          <button type="button" onClick={() => setPageIndex((value) => clamp(value + 1, 0, pages.length - 1))}>⌄</button>
          <button type="button" onClick={() => setPageIndex(pages.length - 1)}>›</button>
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
          onClose={() => setSignatureModalOpen(false)}
          onSave={(signature) => {
            setActiveSignature(signature);
            setSignatureText(signature.content || signatureText);
            setSignatureModalOpen(false);
            setTool("signature");
            showToast("Signature saved. Click the page to place it.");
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
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LandingPage({ fileInputRef, onUpload, onSelectFiles, onLogin }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [uploadActive, setUploadActive] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const categories = ["All", "Edit & Sign", "Convert from PDF", "Convert to PDF", "Organize", "Optimize"];
  const tools = [
    ["Edit PDF", "PDF", "Edit & Sign", "Popular", FileText],
    ["Sign PDF", "PDF", "Edit & Sign", "", PenLine],
    ["Annotate", "PDF", "Edit & Sign", "", MessageSquare],
    ["Redact PDF", "PDF", "Edit & Sign", "", Eraser],
    ["PDF to Word", "PDF -> DOC", "Convert from PDF", "Top", FileText],
    ["PDF to Excel", "PDF -> XLS", "Convert from PDF", "", FileText],
    ["PDF to JPG", "PDF -> JPG", "Convert from PDF", "", ImageIcon],
    ["PDF to PNG", "PDF -> PNG", "Convert from PDF", "", ImageIcon],
    ["PDF to PPTX", "PDF -> PPT", "Convert from PDF", "", FileText],
    ["PDF to Text", "PDF -> TXT", "Convert from PDF", "", Type],
    ["Word to PDF", "DOC -> PDF", "Convert to PDF", "", FileText],
    ["JPG to PDF", "JPG -> PDF", "Convert to PDF", "", ImageIcon],
    ["Excel to PDF", "XLS -> PDF", "Convert to PDF", "", FileText],
    ["PNG to PDF", "PNG -> PDF", "Convert to PDF", "", ImageIcon],
    ["PPTX to PDF", "PPT -> PDF", "Convert to PDF", "", FileText],
    ["Merge PDF", "PDF", "Organize", "Top", FilePlus2],
    ["Split PDF", "PDF", "Organize", "", FileText],
    ["Rotate PDF", "PDF", "Organize", "", Redo2],
    ["Reorder pages", "PDF", "Organize", "", Grid2X2],
    ["Delete pages", "PDF", "Organize", "", Trash2],
    ["Compress PDF", "PDF", "Optimize", "Popular", Download],
    ["Unlock PDF", "PDF", "Optimize", "", CheckCircle2],
    ["Protect PDF", "PDF", "Optimize", "", CheckCircle2],
    ["Watermark", "PDF", "Optimize", "", Paintbrush],
  ];
  const visibleTools = activeCategory === "All" ? tools : tools.filter((tool) => tool[2] === activeCategory);
  const faq = [
    ["Is CosmicPDF really free to use?", "Yes. You can upload, edit, fill, sign, and download a PDF without creating an account. Larger team and cloud workflows can be upgraded later."],
    ["Are my documents safe and private?", "Files are handled in a secure browser workspace in this local clone. The source experience emphasizes 256-bit SSL, automatic deletion, GDPR, and CCPA messaging."],
    ["Do I need to install software?", "No. The source is a browser-first PDF editor. This clone keeps that flow: upload, edit, and download from the web app."],
    ["Can I edit a scanned PDF?", "Scanned PDFs can be annotated, signed, highlighted, and exported. OCR-level text replacement would be a future backend feature."],
    ["Are eSignatures legally binding in the US?", "The signing flow supports typed, drawn, and uploaded signatures. Legal validity depends on consent, recordkeeping, and workflow requirements."],
    ["What file size can I upload?", "The captured source says PDFs up to 100 MB. This local implementation keeps the existing app limit for browser stability."],
    ["How do I cancel?", "There is no subscription flow in this local clone; login and paid plan flows are represented as interactive UI states only."],
  ];
  const navItems = [
    ["All tools", "#tools"],
    ["IRS Forms", "#forms"],
    ["How it works", "#how"],
    ["Reviews", "#reviews"],
  ];
  const scenarios = [
    ["11:18 PM - APRIL 14", "\"My W-9 has a typo.\"", "A nurse in Phoenix realizes her contractor 1099 went out with the wrong SSN. She redacts, edits, signs, re-fills - in under 3 minutes. Before the IRS clock turned.", "Edit + Redact"],
    ["7:42 AM - TUESDAY", "\"Sign this before 9 AM.\"", "A new contractor in Austin gets a Friday morning sign-on offer. Coffee in one hand, baby in the other. He signs the NDA from his phone in 14 seconds.", "Sign PDF"],
    ["4:56 PM - FRIDAY", "\"The SBA portal closes in 5.\"", "A small-business owner in Tampa needs to merge a 22-page loan packet, compress it under 5 MB, and submit before the portal locks for the weekend.", "Merge + Compress"],
    ["2:13 AM - SATURDAY", "\"The addendum, signed.\"", "A landlord in Brooklyn closes a midnight lease addendum. Edits two clauses, signs with the phone trackpad, texts the PDF before the tenant boards a flight.", "Edit + Sign"],
  ];
  const reviews = [
    ["/cosmic-assets/review-men-52.jpg", "Marcus T.", "Property Manager - Atlanta, GA", "\"Saved me $20/month and 3 hours a week.\"", "Canceled Adobe after trying this. The AI redaction is worth it alone - I was manually black-boxing SSNs on tenant applications. Now it's one click."],
    ["/cosmic-assets/review-women-68.jpg", "Sarah K.", "Founder - Brooklyn, NY", "\"Filed my 1099s from my phone on a flight.\"", "I had to send 11 contractors their 1099-MISCs before Jan 31. Did it all from JFK boarding gate. Auto-fill recognized every field perfectly."],
    ["/cosmic-assets/review-men-45.jpg", "Daniel R.", "Software Engineer - Austin, TX", "\"Finally a PDF editor my mom can use.\"", "I sent my 68-year-old mother a passport application. She filled out the DS-11 on her iPad without calling me once. That's the highest praise I can give."],
  ];

  const uploadClick = () => {
    setUploadActive(true);
    onSelectFiles();
  };

  return (
    <main className="cosmic-page">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <header className="cosmic-header">
        <a className="cosmic-brand" href="#hero" onClick={() => setMobileMenuOpen(false)}><span><Box size={17} /></span> CosmicPDF</a>
        <nav className="cosmic-nav" aria-label="Primary">
          {navItems.map(([label, href]) => <a key={label} href={href}>{label}{label === "All tools" && <ChevronDown size={13} />}</a>)}
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
          <h1>Edit a PDF online.</h1>
          <p>AI-powered. Free to start. Ready in 3 seconds.</p>
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
            <div className="cosmic-upload-icon"><Upload size={42} /></div>
            <h2>{uploadActive ? "Release to upload it securely" : "Drop your PDF here to edit"}</h2>
            <button type="button" onClick={uploadClick}><Zap size={17} fill="currentColor" /> Upload from your device</button>
            <span>Upload documents up to 100 MB</span>
          </div>
          <div className="cosmic-trustpilot">
            <strong><Star size={13} fill="currentColor" /> Trustpilot</strong>
            <div className="cosmic-stars" aria-label="Five star rating">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={`star-${index}`}><Star size={13} fill="currentColor" /></span>
              ))}
            </div>
            <b>TrustScore 4.8</b>
            <span>5,247 reviews</span>
          </div>
          <div className="cosmic-security">
            <span><CheckCircle2 size={14} /> 256-bit SSL</span>
            <span><CheckCircle2 size={14} /> Auto-deleted in 1h</span>
            <span><CheckCircle2 size={14} /> GDPR & CCPA</span>
          </div>
        </div>
      </section>

      <section id="how" className="cosmic-steps">
        <p className="cosmic-pill">3 steps - 30 seconds</p>
        <h2>Edit your PDF in three clicks.</h2>
        <p>No downloads, no accounts, no friction.</p>
        <div className="cosmic-step-grid">
          {[
            ["1", "Upload your file", "Drag & drop or browse. PDFs up to 100 MB. Works on any device.", Upload],
            ["2", "Edit, fill or sign", "Change text, fill fields, highlight, redact, sign - full control, no learning curve.", PenLine],
            ["3", "Download or share", "Save the new PDF, email it, or get a secure share link. Quality preserved.", Download],
          ].map(([num, title, copy, Icon]) => (
            <article key={title}><small>{num}</small><Icon size={24} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section id="tools" className="cosmic-tools">
        <p className="cosmic-pill">One workspace - 24+ tools</p>
        <h2>Need to do something else with your PDF?</h2>
        <p>Convert, merge, compress, sign, redact, summarize - every PDF task in one place.</p>
        <div className="cosmic-filters">
          {categories.map((category) => (
            <button key={category} type="button" className={activeCategory === category ? "is-active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
          ))}
        </div>
        <div className="cosmic-tool-grid">
          {visibleTools.map(([name, format, category, badge, Icon]) => (
            <button key={name} type="button" className="cosmic-tool-card" onClick={uploadClick}>
              <span className="cosmic-chip-row">
                {format.split(" -> ").map((chip, chipIndex) => (
                  <span key={`${name}-${chip}`} className={`cosmic-file-chip cosmic-file-${chip.toLowerCase()}`}>{chip}</span>
                ))}
              </span>
              <strong>{name}</strong>
              {badge && <em>{badge}</em>}
            </button>
          ))}
        </div>
      </section>

      <section id="forms" className="cosmic-forms">
        <span className="cosmic-us-flag" aria-hidden="true" />
        <div><strong>Built for the US.</strong><p>Fill 30+ tax & HR forms - W-9, 1099, 1040, W-4 and more.</p></div>
        <div className="cosmic-form-tags"><span>W-9</span><span>1099</span><span>1040</span><span>W-4</span></div>
        <a href="#tools">See all <ChevronDown size={14} /></a>
      </section>

      <section className="cosmic-scenarios">
        <p className="cosmic-pill">When you really need it</p>
        <h2>For the moments the deadline <span>won't wait.</span></h2>
        <p>Four documents Americans actually face - and the night they really needed them done.</p>
        <div>
          {scenarios.map(([time, title, copy, action]) => (
            <article key={title}>
              <small>{time}</small>
              <h3>{title}</h3>
              <p>{copy}</p>
              <button type="button" onClick={uploadClick}><Zap size={14} /> {action}</button>
            </article>
          ))}
        </div>
      </section>

      <section id="reviews" className="cosmic-reviews">
        <div className="cosmic-review-heading">
          <h2>Real reviews from real Americans.</h2>
          <aside>
            <strong><Star size={13} fill="currentColor" /> Trustpilot</strong>
            <div className="cosmic-stars" aria-label="Five star rating">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={`review-star-${index}`}><Star size={13} fill="currentColor" /></span>
              ))}
            </div>
            <b>TrustScore 4.8</b>
            <p>Based on 5,247 reviews.</p>
          </aside>
        </div>
        <div>
          {reviews.map(([src, name, role, title, copy]) => (
            <article key={title}>
              <div className="cosmic-stars" aria-label="Five star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={`${name}-star-${index}`}><Star size={13} fill="currentColor" /></span>
                ))}
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <footer><img src={src} alt="" /><span><b>{name}</b><small>{role}</small></span></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="cosmic-faq">
        <h2>Questions, answered.</h2>
        <p>Everything you need to know before you upload. Don't see your question? Our team replies within 2 hours.</p>
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
        <strong>Certified & audited</strong>
        {["SOC 2 Type II", "GDPR compliant", "CCPA compliant", "HIPAA-ready", "ESIGN Act - UETA", "ISO 27001"].map((item) => (
          <span key={item}><CheckCircle2 size={14} /> {item}</span>
        ))}
      </section>

      <section className="cosmic-final-cta">
        <h2>Stop printing.<br />Stop emailing.<br />Edit your PDF online.</h2>
        <p>Drop your file in. Make your edits. Download. We get out of your way.</p>
        <button type="button" onClick={uploadClick}><FilePlus2 size={18} /> Upload your PDF - free</button>
        <div><span><Zap size={14} /> Ready in 12 seconds</span><span><CheckCircle2 size={14} /> 256-bit SSL</span><span><Grid2X2 size={14} /> Any device</span></div>
      </section>

      <footer className="cosmic-footer">
        <div><a className="cosmic-brand" href="#hero"><span><Box size={17} /></span> CosmicPDF</a><p>The PDF editor built for Americans. Edit, sign, fill, convert - all in your browser.</p></div>
        <div><strong>Edit & Sign</strong><a href="#tools">Edit PDF</a><a href="#tools">Sign PDF</a><a href="#tools">Annotate</a><a href="#tools">Redact PDF</a></div>
        <div><strong>Convert</strong><a href="#tools">PDF to Word</a><a href="#tools">PDF to Excel</a><a href="#tools">PDF to JPG</a><a href="#tools">Word to PDF</a><a href="#tools">JPG to PDF</a></div>
        <div><strong>US Forms</strong><a href="#forms">W-9</a><a href="#forms">I-9</a><a href="#forms">1099-NEC</a><a href="#forms">1040</a><a href="#forms">W-4</a></div>
        <div><strong>Company</strong><a href="#reviews">About</a><a href="#reviews">Reviews</a><a href="#how">Security</a><a href="#hero">Help center</a><a href="#hero">Contact</a></div>
        <div className="cosmic-footer-bottom"><button type="button" onClick={() => setLanguageOpen((value) => !value)}>English (US) <ChevronDown size={14} /></button>{languageOpen && <div className="cosmic-language-menu">{["English (US)", "English (UK)", "Spanish", "German", "French", "Italian", "Portuguese", "Japanese"].map((label) => <button key={label} type="button">{label}</button>)}</div>}<span>VISA</span><span>MC</span><span>AMEX</span><span>PayPal</span><span>Apple Pay</span><span>G Pay</span><em>SSL 256</em><em>SOC 2</em><em>GDPR</em></div>
      </footer>
    </main>
  );
}

function AuthPage({ mode, setMode, onBack, onComplete }) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submitAuth = (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email to continue.");
      return;
    }
    setError("");
    onComplete({ email: email.trim(), name: name.trim() });
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <button type="button" className="landing-brand auth-brand" onClick={onBack}><span>P</span> {APP_NAME}</button>
        <div>
          <p className="eyebrow">Secure document workspace</p>
          <h1>{isSignup ? "Create your workspace and upload your first PDF." : "Welcome back to your document workspace."}</h1>
          <p>Use one account to upload PDFs, fill forms, place signatures, manage templates, and export final documents from the browser.</p>
        </div>
        <div className="auth-proof-list">
          <span><CheckCircle2 size={17} /> Browser-based PDF editor</span>
          <span><CheckCircle2 size={17} /> Autosaved documents and templates</span>
          <span><CheckCircle2 size={17} /> Signatures, comments, sharing, export</span>
        </div>
      </section>

      <section className="auth-card" aria-label={isSignup ? "Create account" : "Log in"}>
        <button type="button" className="auth-back" onClick={onBack}>Back</button>
        <h2>{isSignup ? "Create free account" : "Log in"}</h2>
        <p>{isSignup ? "Start with a local workspace, then upload or create a document." : "Continue to your dashboard and recent documents."}</p>
        <button type="button" className="sso-button" onClick={() => onComplete({ email: email.trim() || "workspace@paperflow.local", name: name.trim() || "Workspace owner" })}><Users size={18} /> Continue with Google</button>
        <div className="auth-divider"><span /> or use email <span /></div>
        <form onSubmit={submitAuth}>
          {isSignup && (
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "Create a password" : "Enter your password"} />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit">{isSignup ? "Create account and continue" : "Log in and continue"}</button>
        </form>
        <div className="auth-switch">
          {isSignup ? "Already have an account?" : `New to ${APP_NAME}?`}
          <button type="button" onClick={() => setMode(isSignup ? "login" : "signup")}>{isSignup ? "Log in" : "Create account"}</button>
        </div>
      </section>
    </main>
  );
}

function ToolSettingsPanel({ tool, settings, setSettings }) {
  const update = (patch) => setSettings((current) => ({ ...current, ...patch }));

  if (!["text", "field", "draw", "highlight", "whiteout", "rectangle", "circle", "line", "arrow"].includes(tool)) {
    return null;
  }

  if (tool === "text" || tool === "field") {
    return (
      <div className="tool-settings">
        {tool === "text" && (
          <label>Font
            <select value={settings.fontFamily} onChange={(event) => update({ fontFamily: event.target.value })}>
              <option>PP Agrandir</option>
              <option>Inter</option>
              <option>Arial</option>
              <option>Times New Roman</option>
            </select>
          </label>
        )}
        <label>Size
          <select value={settings.textSize} onChange={(event) => update({ textSize: Number(event.target.value) })}>
            {[10, 12, 14, 16, 18, 24, 32].map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>
        <ColorControl value={settings.textColor} onChange={(color) => update({ textColor: color })} />
        {tool === "text" && (
          <>
            <label>Line
              <select value={settings.lineHeight} onChange={(event) => update({ lineHeight: Number(event.target.value) })}>
                {[1, 1.15, 1.25, 1.5, 2].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <div className="align-group" aria-label="Text alignment">
              {["left", "center", "right"].map((align) => (
                <button key={align} type="button" className={settings.textAlign === align ? "is-active" : ""} onClick={() => update({ textAlign: align })}>{align[0].toUpperCase()}</button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (tool === "draw") {
    return (
      <div className="tool-settings">
        <ColorControl value={settings.drawColor} onChange={(color) => update({ drawColor: color })} />
        <label>Stroke
          <input type="range" min="1" max="16" value={settings.drawStroke} onChange={(event) => update({ drawStroke: Number(event.target.value) })} />
        </label>
        <output>{settings.drawStroke}px</output>
      </div>
    );
  }

  if (tool === "highlight") {
    return (
      <div className="tool-settings">
        <ColorControl value={settings.highlightColor} onChange={(color) => update({ highlightColor: color })} />
        <label>Opacity
          <input type="range" min="25" max="95" value={Math.round(settings.highlightOpacity * 100)} onChange={(event) => update({ highlightOpacity: Number(event.target.value) / 100 })} />
        </label>
        <output>{Math.round(settings.highlightOpacity * 100)}%</output>
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

function ColorControl({ value, onChange }) {
  const palette = [colors.black, colors.blue, colors.red, colors.green, colors.violet, colors.yellow];
  return (
    <div className="mini-swatches" aria-label="Color">
      {palette.map((color) => (
        <button key={color} type="button" className={value === color ? "is-selected" : ""} style={{ backgroundColor: color }} onClick={() => onChange(color)} />
      ))}
    </div>
  );
}

function UploadLanding({
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
}) {
  const [activeSection, setActiveSection] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionView, setSuggestionView] = useState("recent");
  const [openPanel, setOpenPanel] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDrafts, setInviteDrafts] = useState([]);
  const [favoriteTrendingIds, setFavoriteTrendingIds] = useState([]);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState(null);

  const primaryNav = [
    { label: "Home", icon: Home },
    { label: "Documents", icon: FileText },
    { label: "Templates", icon: Grid2X2 },
    { label: "Agreements", icon: Box },
    { label: "Sign", icon: PenLine },
    { label: "Settings", icon: Settings },
  ];

  const quickActions = [
    { label: "Upload a PDF", icon: Upload, action: onSelectFiles },
    { label: "Write my agreement", icon: Box, action: () => setActiveSection("Agreements") },
    { label: "Edit a PDF", icon: FileText, action: onSelectFiles },
    { label: "Get signatures", icon: PenLine, action: () => setActiveSection("Sign") },
    { label: "Find a template", icon: Grid2X2, action: () => setActiveSection("Templates") },
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
  const filteredDocuments = documents.filter((documentRecord) => (
    matchesSearch(documentRecord.name)
  ));
  const filteredTemplateCards = templateCards.filter(({ title, detail }) => matchesSearch(`${title} ${detail}`));
  const filteredAgreementFlows = agreementFlows.filter(({ title, detail }) => matchesSearch(`${title} ${detail}`));

  const trendingRows = [
    { id: "trend-nda", name: "Mutual NDA template", location: "Templates", updatedAt: nowIso(), favorite: favoriteTrendingIds.includes("trend-nda") },
    { id: "trend-sign", name: "Signature request packet", location: "Signatures", updatedAt: nowIso(), favorite: favoriteTrendingIds.includes("trend-sign") },
    { id: "trend-review", name: "Contract review workspace", location: "Agreements", updatedAt: nowIso(), favorite: favoriteTrendingIds.includes("trend-review") },
  ].filter((row) => matchesSearch(row.name));

  const demoRecentRows = normalizedQuery ? [] : [{
    id: "demo-minoria-nda",
    name: "Minoria_Tech_Intern_NDA_Wasseem_Dabbas",
    location: "My documents",
    updatedAt: nowIso(),
    pageCount: 9,
    demo: true,
  }];
  const visibleRows = suggestionView === "recent" ? (filteredDocuments.length ? filteredDocuments : demoRecentRows) : trendingRows;
  const totalPages = documents.reduce((total, documentRecord) => total + (documentRecord.pageCount || documentRecord.pages?.length || 1), 0);
  const favoriteCount = documents.filter((documentRecord) => documentRecord.favorite).length;
  const storageUsed = documents.reduce((total, documentRecord) => total + (documentRecord.size || 0), 0);
  const isUploading = uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status);

  const closePanel = () => setOpenPanel(null);

  const toggleTrendingFavorite = (id) => {
    setFavoriteTrendingIds((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    setWorkspaceNotice(favoriteTrendingIds.includes(id) ? "Removed suggestion from favorites." : "Added suggestion to favorites.");
  };

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

  const documentLink = (documentRecord) => {
    const origin = window.location.origin || "http://127.0.0.1:5173";
    const slug = documentRecord.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "document";
    return `${origin}/share/${slug}?doc=${encodeURIComponent(documentRecord.id)}`;
  };

  const copyDocumentLink = async (documentRecord, label = "Link copied.") => {
    try {
      await navigator.clipboard.writeText(documentLink(documentRecord));
    } catch {
      const input = window.document.createElement("input");
      input.value = documentLink(documentRecord);
      window.document.body.appendChild(input);
      input.select();
      window.document.execCommand?.("copy");
      input.remove();
    }
    setWorkspaceNotice(label);
  };

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
                    toggleTrendingFavorite(documentRecord.id);
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
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => copyDocumentLink(documentRecord))}><Link size={20} /> Copy link</button>
                        <button type="button" role="menuitem" onClick={(event) => runDocumentMenuAction(event, () => copyDocumentLink(documentRecord, "Share link copied."))}><Share2 size={20} /> Share</button>
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

    if (activeSection === "Agreements" || activeSection === "Sign") {
      const isSign = activeSection === "Sign";
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
      const storageUsed = documents.reduce((total, documentRecord) => total + (documentRecord.size || 0), 0);
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
              <span>{documents.filter((documentRecord) => documentRecord.favorite).length} saved document{documents.filter((documentRecord) => documentRecord.favorite).length === 1 ? "" : "s"} marked for quick access.</span>
            </article>
            <article>
              <strong>Invites</strong>
              <span>{inviteDrafts.length} invite draft{inviteDrafts.length === 1 ? "" : "s"} staged for the workspace.</span>
            </article>
            <article>
              <strong>Storage</strong>
              <span>{documents.length} document{documents.length === 1 ? "" : "s"} saved locally, {formatBytes(storageUsed)} used.</span>
            </article>
            <article>
              <strong>Export policy</strong>
              <span>Download creates a rebuilt PDF with current page order and annotations.</span>
            </article>
          </div>
        </section>
      );
    }

    return (
      <>
        <section
          className={`dashboard-drop-hero ${isDraggingFile ? "is-dragging" : ""} ${isUploading ? "is-uploading" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) {
              setIsDraggingFile(false);
            }
          }}
          onDrop={onDropFile}
        >
          <div className="dashboard-hero-copy">
            <p className="eyebrow">Secure browser workspace</p>
            <h1>Edit, sign, and manage PDFs in one place.</h1>
            <p>Drop in a PDF to start editing immediately, or create a reusable document workflow for signing, review, and export.</p>
            <div className="dashboard-hero-actions">
              <button type="button" className="dashboard-primary" onClick={onSelectFiles}><Upload size={18} /> Upload PDF</button>
              <button type="button" className="dashboard-secondary" onClick={onBlankPage}><FilePlus2 size={18} /> Start blank</button>
            </div>
          </div>
          <div className="dashboard-upload-panel">
            <Upload size={30} />
            <strong>{isDraggingFile ? "Drop your PDF to upload" : isUploading ? uploadStage.status : "Drag and drop PDF"}</strong>
            <span>{isUploading ? uploadStage.fileName : "PDFs are validated, rendered, and saved locally before opening in the editor."}</span>
            <div className="upload-progress-track"><span style={{ width: `${uploadStage?.percent || 0}%` }} /></div>
            {uploadError && <p className="upload-error">{uploadError}</p>}
          </div>
        </section>

        <section className="dashboard-stat-grid" aria-label="Workspace stats">
          <article><strong>{documents.length}</strong><span>Documents</span></article>
          <article><strong>{totalPages}</strong><span>Pages managed</span></article>
          <article><strong>{favoriteCount}</strong><span>Starred</span></article>
          <article><strong>{formatBytes(storageUsed)}</strong><span>Local storage</span></article>
        </section>

        <section className="lumin-action-grid">
          {quickActions.map(({ label, icon: Icon, action }) => (
            <button key={label} type="button" className="lumin-action-card" onClick={action}>
              <Icon size={31} />
              <span>{label}</span>
            </button>
          ))}
        </section>

        <section className="document-library">
          <div className="library-head">
            <h2>Suggested documents</h2>
          </div>
          <div className="suggestion-tabs">
            <button type="button" className={suggestionView === "recent" ? "is-active" : ""} onClick={() => setSuggestionView("recent")}><Undo2 size={22} /> You opened recently</button>
            <button type="button" className={suggestionView === "trending" ? "is-active" : ""} onClick={() => setSuggestionView("trending")}><ArrowDownToLine size={22} /> Trending</button>
          </div>
          {renderDocumentTable(visibleRows, suggestionView === "recent" ? "documents" : "trending")}
        </section>
      </>
    );
  };

  return (
    <main className="upload-shell lumin-home">
      <input ref={fileInputRef} className="hidden-input" type="file" accept="application/pdf" onChange={onUpload} />
      <aside className="lumin-home-rail">
        <button type="button" className="rail-brand-tile" onClick={() => setActiveSection("Home")}><Building2 size={24} /></button>
        <button type="button" className="rail-mini-action" onClick={() => setOpenPanel("invite")}><Users size={22} /></button>
        <nav className="upload-nav" aria-label="Primary">
          {primaryNav.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className={label === activeSection ? "is-active" : ""} onClick={() => setActiveSection(label)}>
              <Icon size={24} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="upload-main">
        <header className="upload-topbar">
          <div className="upload-logo"><span>L</span> Lumin</div>
          <label className="lumin-search">
            <Search size={25} />
            <input type="search" placeholder="Search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </label>
          <div className="upload-top-actions">
            <button type="button" className="invite-button" onClick={() => setOpenPanel(openPanel === "invite" ? null : "invite")}><Users size={18} /> Invite members</button>
            <button type="button" className="top-icon" onClick={() => setOpenPanel(openPanel === "help" ? null : "help")}><CircleHelp size={17} /></button>
            <button type="button" className="top-icon" onClick={() => setOpenPanel(openPanel === "notifications" ? null : "notifications")}><Bell size={17} /></button>
            <button type="button" className="top-avatar" onClick={() => setOpenPanel(openPanel === "account" ? null : "account")}>WD</button>
            {openPanel && (
              <div className="workspace-popover">
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
                    <h3>Wasseem Dabbas</h3>
                    <p>{APP_NAME} workspace owner. Documents are saved in this browser until exported or deleted.</p>
                    <button type="button" className="popover-primary" onClick={() => setActiveSection("Settings")}>Workspace settings</button>
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
  onSave,
  onExport,
  onShare,
  onPrint,
  onSignatureModal,
}) {
  const title = selected?.type ? selected.type[0].toUpperCase() + selected.type.slice(1) : activeTool === "signature" ? "Signature" : "Properties";
  const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState(selected?.color || colors.black);

  useEffect(() => {
    setCustomColorDraft(selected?.color || colors.black);
    setIsCustomColorOpen(false);
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
              <span>{selected.type === "field" ? "Field label" : "Content"}</span>
              <textarea value={selected.content} onChange={(event) => updateAnnotation(selected.id, { content: event.target.value })} />
            </label>
          )}

          {selected.type === "comment" && (
            <div className="comment-editor">
              <div className="comment-meta">
                <strong>{selected.author || "You"}</strong>
                <span>{formatDateTime(selected.updatedAt)}</span>
              </div>
              <label className="field">
                <span>Comment</span>
                <textarea
                  value={selected.content}
                  onChange={(event) => updateAnnotation(selected.id, { content: event.target.value, updatedAt: nowIso() })}
                />
              </label>
            </div>
          )}

          {(selected.type === "text" || selected.type === "field") && (
            <>
              <div className="field-row">
                {selected.type === "text" && <label className="field"><span>Font</span><select value={selected.fontFamily || "PP Agrandir"} onChange={(event) => updateAnnotation(selected.id, { fontFamily: event.target.value })}><option>PP Agrandir</option><option>Inter</option><option>Arial</option><option>Times New Roman</option></select></label>}
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
          <div className="document-info">
            <span>Document</span>
            <strong>{fileName}</strong>
            <small>{pages.length} page{pages.length === 1 ? "" : "s"} · {annotations.length} annotation{annotations.length === 1 ? "" : "s"}</small>
            <small>Status: {saveState === "saving" ? "saving" : saveState}</small>
          </div>
          <label className="field">
            <span>Signature text</span>
            <input value={signatureText} onChange={(event) => setSignatureText(event.target.value)} />
          </label>
          <button type="button" className="panel-action" onClick={onSignatureModal}><PenLine size={17} /> Create signature</button>
          <button type="button" className="panel-action" onClick={onSave}><Save size={17} /> Save locally</button>
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
  return (
    <section className="document-comments-panel" aria-label="Document comments">
      <header>
        <div>
          <h3>Comments</h3>
          <span>{comments.length ? `${comments.length} open thread${comments.length === 1 ? "" : "s"}` : "No comments yet"}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close comments"><X size={16} /></button>
      </header>
      <button type="button" className="comment-add-button" onClick={onAddComment}><MessageSquare size={16} /> Add comment</button>
      <div className="document-comment-list">
        {!comments.length && (
          <p>Click Add comment, then click anywhere on the PDF to place a review note.</p>
        )}
        {comments.map((comment) => (
          <button
            key={comment.id}
            type="button"
            className={selectedId === comment.id ? "is-active" : ""}
            onClick={() => onSelect(comment)}
          >
            <span>Page {comment.page + 1}</span>
            <strong>{comment.content}</strong>
            <small>{comment.author} · {formatDateTime(comment.updatedAt)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function SignatureModal({ defaultName, onClose, onSave }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [tab, setTab] = useState("draw");
  const [typedName, setTypedName] = useState(defaultName || "Jane Smith");
  const [uploadedImage, setUploadedImage] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const drawingRef = useRef(false);

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
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    if (tab === "upload" && uploadedImage) {
      onSave({ content: typedName || "Signature", imageDataUrl: uploadedImage });
      return;
    }
    if (tab === "draw" && hasInk) {
      onSave({ content: typedName || "Signature", imageDataUrl: canvasRef.current.toDataURL("image/png") });
      return;
    }
    onSave({ content: typedName || "Signature", imageDataUrl: "" });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create signature">
      <section className="signature-modal">
        <header>
          <div>
            <h2>Create signature</h2>
            <p>Save a reusable signature, then click the PDF page to place it.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="signature-tabs">
          {["draw", "type", "upload"].map((item) => (
            <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {tab === "draw" && (
          <div className="signature-draw-pad">
            <canvas
              ref={canvasRef}
              width="640"
              height="220"
              onPointerDown={drawStart}
              onPointerMove={drawMove}
              onPointerUp={drawEnd}
              onPointerLeave={drawEnd}
            />
            <button type="button" onClick={clearCanvas}>Clear</button>
          </div>
        )}

        {tab === "type" && (
          <label className="field signature-type">
            <span>Typed signature</span>
            <input value={typedName} onChange={(event) => setTypedName(event.target.value)} />
            <strong>{typedName || "Signature"}</strong>
          </label>
        )}

        {tab === "upload" && (
          <div className="signature-upload">
            <input ref={fileRef} className="hidden-input" type="file" accept="image/png,image/jpeg" onChange={onUploadSignature} />
            <button type="button" onClick={() => fileRef.current?.click()}><Upload size={17} /> Upload image</button>
            {uploadedImage ? <img src={uploadedImage} alt="Uploaded signature preview" /> : <p>PNG or JPG signatures work best on a transparent or white background.</p>}
          </div>
        )}

        <footer>
          <button type="button" className="modal-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="modal-primary" onClick={saveSignature}>Save signature</button>
        </footer>
      </section>
    </div>
  );
}

function ShareModal({ fileName, onClose, onExport }) {
  const [access, setAccess] = useState("restricted");
  const [permission, setPermission] = useState("view");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Please review this PDF when you have a chance.");
  const [invites, setInvites] = useState([]);
  const [copyState, setCopyState] = useState("Copy link");
  const linkInputRef = useRef(null);
  const shareLink = useMemo(() => {
    const origin = window.location.origin || "http://127.0.0.1:5173";
    const slug = fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "document";
    return `${origin}/share/${slug}?access=${access}&permission=${permission}`;
  }, [access, fileName, permission]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyState("Copied");
    } catch {
      linkInputRef.current?.select();
      window.document.execCommand?.("copy");
      setCopyState("Copied");
    }
    window.setTimeout(() => setCopyState("Copy link"), 1600);
  };

  const addInvite = () => {
    const cleanedEmail = email.trim();
    if (!cleanedEmail) return;
    setInvites((items) => [...items, { email: cleanedEmail, permission, message, id: makeId("invite") }]);
    setEmail("");
  };

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
              <Share2 size={20} />
              <div>
                <h3>Document link</h3>
                <p>Generate a review link for this workspace. Export remains the production-safe handoff for this local build.</p>
              </div>
            </div>
            <div className="share-link-row">
              <input ref={linkInputRef} readOnly value={shareLink} aria-label="Share link" />
              <button type="button" onClick={copyShareLink}>{copyState}</button>
            </div>
          </section>

          <section className="share-grid">
            <label className="field">
              <span>Access</span>
              <select value={access} onChange={(event) => setAccess(event.target.value)}>
                <option value="restricted">Only invited people</option>
                <option value="workspace">Anyone in workspace</option>
                <option value="public">Anyone with link</option>
              </select>
            </label>
            <label className="field">
              <span>Permission</span>
              <select value={permission} onChange={(event) => setPermission(event.target.value)}>
                <option value="view">Can view</option>
                <option value="comment">Can comment</option>
                <option value="edit">Can edit</option>
                <option value="sign">Can sign</option>
              </select>
            </label>
          </section>

          <section className="share-card">
            <div className="share-card-head">
              <Users size={20} />
              <div>
                <h3>Invite people</h3>
                <p>Draft reviewers or signers before exporting or connecting hosted auth.</p>
              </div>
            </div>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            <button type="button" className="invite-draft-button" onClick={addInvite}><Send size={16} /> Add invite draft</button>
            {invites.length > 0 && (
              <div className="invite-list">
                {invites.map((invite) => (
                  <div key={invite.id}>
                    <strong>{invite.email}</strong>
                    <span>{invite.permission} access</span>
                  </div>
                ))}
              </div>
            )}
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
