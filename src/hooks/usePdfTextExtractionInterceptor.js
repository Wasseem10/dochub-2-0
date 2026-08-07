import { useCallback, useEffect, useRef, useState } from "react";
import { runLocalPdfOcr } from "../tools/browserOcrPipeline.js";
import { detectScannedPdf } from "../tools/scannedPdfDetection.js";

const INITIAL_STATE = Object.freeze({
  phase: "idle",
  progress: 0,
  message: "",
  error: "",
  pendingFile: null,
  detection: null,
  extractionSource: null,
});

export function usePdfTextExtractionInterceptor({
  onStart,
  onTextReady,
  detect = detectScannedPdf,
  runOcr = runLocalPdfOcr,
} = {}) {
  const [state, setState] = useState(INITIAL_STATE);
  const operationRef = useRef(0);
  const controllerRef = useRef(null);

  const cancelActiveOperation = useCallback(() => {
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => cancelActiveOperation, [cancelActiveOperation]);

  const reset = useCallback(() => {
    cancelActiveOperation();
    setState(INITIAL_STATE);
  }, [cancelActiveOperation]);

  const handleFile = useCallback(async (file) => {
    cancelActiveOperation();
    if (!file) return;
    const operation = operationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    onStart?.(file);
    setState({ ...INITIAL_STATE, phase: "detecting", message: "Checking for selectable text…", pendingFile: file });

    try {
      const detection = await detect(file, {
        signal: controller.signal,
        onProgress: ({ progress }) => {
          if (operation === operationRef.current) {
            setState((current) => ({ ...current, progress, message: "Checking for selectable text…" }));
          }
        },
      });
      if (operation !== operationRef.current) return;

      if (detection.isImageOnly) {
        setState({
          ...INITIAL_STATE,
          phase: "prompting",
          pendingFile: file,
          detection,
          message: "This PDF needs local OCR before extraction.",
        });
        return;
      }

      const payload = {
        file,
        pages: detection.pages.map(({ pageNumber, text }) => ({ pageNumber, text })),
        fullText: detection.pages.map((page) => `Page ${page.pageNumber}\n${page.text}`).join("\n\n"),
        source: "embedded",
        detection,
      };
      await onTextReady?.(payload);
      if (operation === operationRef.current) {
        setState({ ...INITIAL_STATE, phase: "ready", progress: 100, extractionSource: "embedded", detection });
      }
    } catch (error) {
      if (operation !== operationRef.current || error?.name === "AbortError") return;
      setState({ ...INITIAL_STATE, phase: "error", error: error?.message || "This PDF could not be inspected." });
    }
  }, [cancelActiveOperation, detect, onStart, onTextReady]);

  const runPendingOcr = useCallback(async ({ language = "eng" } = {}) => {
    const file = state.pendingFile;
    const detection = state.detection;
    if (!file || !detection) return;

    cancelActiveOperation();
    const operation = operationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, phase: "processing", progress: 1, message: "Loading local OCR…", error: "" }));

    try {
      const result = await runOcr({
        file,
        sourceBytes: detection.sourceBytes,
        language,
        signal: controller.signal,
        onProgress: ({ progress, message }) => {
          if (operation === operationRef.current) {
            setState((current) => ({ ...current, phase: "processing", progress, message }));
          }
        },
      });
      if (operation !== operationRef.current) return;
      await onTextReady?.({ file, ...result, detection });
      if (operation === operationRef.current) {
        setState({ ...INITIAL_STATE, phase: "ready", progress: 100, extractionSource: "ocr", detection });
      }
    } catch (error) {
      if (operation !== operationRef.current || error?.name === "AbortError") return;
      setState((current) => ({ ...current, phase: "prompting", progress: 0, message: "", error: error?.message || "Local OCR could not be completed." }));
    }
  }, [cancelActiveOperation, onTextReady, runOcr, state.detection, state.pendingFile]);

  return { ...state, handleFile, runPendingOcr, reset };
}

