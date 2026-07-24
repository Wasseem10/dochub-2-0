import Archive from "lucide-react/dist/esm/icons/archive.mjs";
import ArrowUpDown from "lucide-react/dist/esm/icons/arrow-up-down.mjs";
import BookOpen from "lucide-react/dist/esm/icons/book-open.mjs";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import Camera from "lucide-react/dist/esm/icons/camera.mjs";
import Code2 from "lucide-react/dist/esm/icons/code-2.mjs";
import Combine from "lucide-react/dist/esm/icons/combine.mjs";
import Crop from "lucide-react/dist/esm/icons/crop.mjs";
import Database from "lucide-react/dist/esm/icons/database.mjs";
import Eraser from "lucide-react/dist/esm/icons/eraser.mjs";
import FileOutput from "lucide-react/dist/esm/icons/file-output.mjs";
import FilePlus2 from "lucide-react/dist/esm/icons/file-plus-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import FileType2 from "lucide-react/dist/esm/icons/file-type-2.mjs";
import Highlighter from "lucide-react/dist/esm/icons/highlighter.mjs";
import Image from "lucide-react/dist/esm/icons/image.mjs";
import Layers from "lucide-react/dist/esm/icons/layers.mjs";
import ListChecks from "lucide-react/dist/esm/icons/list-checks.mjs";
import ListOrdered from "lucide-react/dist/esm/icons/list-ordered.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.mjs";
import Minimize2 from "lucide-react/dist/esm/icons/minimize-2.mjs";
import PanelsTopLeft from "lucide-react/dist/esm/icons/panels-top-left.mjs";
import PencilLine from "lucide-react/dist/esm/icons/pencil-line.mjs";
import PenLine from "lucide-react/dist/esm/icons/pen-line.mjs";
import Presentation from "lucide-react/dist/esm/icons/presentation.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import ScanText from "lucide-react/dist/esm/icons/scan-text.mjs";
import Scissors from "lucide-react/dist/esm/icons/scissors.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import Share2 from "lucide-react/dist/esm/icons/share-2.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import Stamp from "lucide-react/dist/esm/icons/stamp.mjs";
import Table2 from "lucide-react/dist/esm/icons/table-2.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Unlock from "lucide-react/dist/esm/icons/unlock.mjs";

const ICONS = {
  archive: Archive,
  book: BookOpen,
  calendar: CalendarDays,
  camera: Camera,
  chat: MessageSquare,
  code: Code2,
  comment: MessageSquare,
  compare: RefreshCw,
  compress: Minimize2,
  contract: FileText,
  convert: RefreshCw,
  crop: Crop,
  database: Database,
  delete: Trash2,
  edit: PencilLine,
  extract: FileOutput,
  "file-plus": FilePlus2,
  form: ListChecks,
  highlight: Highlighter,
  image: Image,
  initials: PenLine,
  invoice: FileText,
  layers: Layers,
  letter: FileText,
  lock: Lock,
  merge: Combine,
  numbers: ListOrdered,
  pages: PanelsTopLeft,
  question: MessageSquare,
  reader: BookOpen,
  redact: Eraser,
  reorder: ArrowUpDown,
  resume: FileText,
  review: Highlighter,
  rotate: RotateCw,
  scan: ScanText,
  search: Search,
  send: Send,
  share: Share2,
  sheet: Table2,
  signature: PenLine,
  slides: Presentation,
  sparkles: Sparkles,
  split: Scissors,
  summary: FileText,
  template: FileText,
  text: FileText,
  translate: RefreshCw,
  unlock: Unlock,
  versions: RefreshCw,
  watermark: Stamp,
  word: FileType2,
};

export function ToolIcon({ name, size = 22, ...props }) {
  const Icon = ICONS[name] || FileText;
  return <Icon size={size} aria-hidden="true" {...props} />;
}
