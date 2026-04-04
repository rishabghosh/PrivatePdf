import { showLoader, hideLoader, showAlert, showWarning } from '../ui.js';
import { t } from '../i18n/i18n';
import {
  downloadFile,
  formatBytes,
} from '../utils/helpers.js';
import { state } from '../state.js';
import { createIcons, icons } from 'lucide';
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';
import { checkMemoryBudget, isLowTier } from '../utils/device-capability.js';

/**
 * Read the last 2KB of a PDF to extract page count from the trailer,
 * avoiding a full file parse that wastes memory on low-tier devices.
 */
async function quickPageCount(file: File): Promise<number | null> {
  try {
    const tail = await file.slice(Math.max(0, file.size - 2048)).arrayBuffer();
    const text = new TextDecoder('latin1').decode(tail);
    const match = text.match(/\/Count\s+(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const fileDisplayArea = document.getElementById('file-display-area');
  const convertOptions = document.getElementById('convert-options');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const updateUI = async () => {
    if (!fileDisplayArea || !convertOptions || !processBtn || !fileControls)
      return;

    if (state.files.length > 0) {
      fileDisplayArea.innerHTML = '';

      for (let index = 0; index < state.files.length; index++) {
        const file = state.files[index];
        const fileDiv = document.createElement('div');
        fileDiv.className =
          'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

        const infoContainer = document.createElement('div');
        infoContainer.className = 'flex flex-col overflow-hidden';

        const nameSpan = document.createElement('div');
        nameSpan.className = 'truncate font-medium text-gray-200 text-sm mb-1';
        nameSpan.textContent = file.name;

        const metaSpan = document.createElement('div');
        metaSpan.className = 'text-xs text-gray-400';
        metaSpan.textContent = `${formatBytes(file.size)} • ${t('common.loadingPageCount')}`;

        infoContainer.append(nameSpan, metaSpan);

        const removeBtn = document.createElement('button');
        removeBtn.className =
          'ml-4 text-red-400 hover:text-red-300 flex-shrink-0';
        removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
        removeBtn.onclick = () => {
          state.files = state.files.filter((_: File, i: number) => i !== index);
          updateUI();
        };

        fileDiv.append(infoContainer, removeBtn);
        fileDisplayArea.appendChild(fileDiv);

        const pageCount = await quickPageCount(file);
        if (pageCount !== null) {
          metaSpan.textContent = `${formatBytes(file.size)} • ${pageCount} pages`;
        } else {
          metaSpan.textContent = formatBytes(file.size);
        }
      }

      createIcons({ icons });
      fileControls.classList.remove('hidden');
      convertOptions.classList.remove('hidden');
      (processBtn as HTMLButtonElement).disabled = false;
    } else {
      fileDisplayArea.innerHTML = '';
      fileControls.classList.add('hidden');
      convertOptions.classList.add('hidden');
      (processBtn as HTMLButtonElement).disabled = true;
    }
  };

  const resetState = () => {
    state.files = [];
    state.pdfDoc = null;
    updateUI();
  };

  const convert = async () => {
    try {
      if (state.files.length === 0) {
        showAlert('No Files', 'Please select at least one PDF file.');
        return;
      }

      const budget = checkMemoryBudget(state.files);
      if (budget.warning) {
        const proceed = await showWarning('Warning', budget.warning);
        if (!proceed) return;
      }

      showLoader('Loading PDF converter...');
      const pymupdf = await loadPyMuPDF();

      hideLoader();
      state.files = await batchDecryptIfNeeded(state.files);
      showLoader('Converting...');

      if (state.files.length === 1) {
        const file = state.files[0];
        showLoader(`Converting ${file.name}...`);

        const docxBlob = await pymupdf.pdfToDocx(file);
        const outName = file.name.replace(/\.pdf$/i, '') + '.docx';

        downloadFile(docxBlob, outName);
        hideLoader();

        // Release file data immediately — don't wait for alert dismissal
        state.files = [];

        showAlert(
          'Conversion Complete',
          `Successfully converted ${file.name} to DOCX.`,
          'success',
          () => resetState()
        );
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            `Converting ${i + 1}/${state.files.length}: ${file.name}...`
          );

          let docxBlob: Blob | null = await pymupdf.pdfToDocx(file);
          const baseName = file.name.replace(/\.pdf$/i, '');
          const arrayBuffer = await docxBlob.arrayBuffer();
          docxBlob = null; // Release blob — we have the arrayBuffer
          const zipEntryName = deduplicateFileName(
            `${baseName}.docx`,
            usedNames
          );
          zip.file(zipEntryName, arrayBuffer);

          // Yield to event loop on low-tier devices so browser can GC
          if (isLowTier() && i < state.files.length - 1) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        showLoader('Creating ZIP archive...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        downloadFile(zipBlob, 'converted-documents.zip');
        hideLoader();

        // Release file data immediately — don't wait for alert dismissal
        const convertedCount = state.files.length;
        state.files = [];

        showAlert(
          'Conversion Complete',
          `Successfully converted ${convertedCount} PDF(s) to DOCX.`,
          'success',
          () => resetState()
        );
      }
    } catch (e: unknown) {
      hideLoader();
      showAlert(
        'Error',
        `An error occurred during conversion. Error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(
        (f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      state.files = [...state.files, ...pdfFiles];
      updateUI();
    }
  };

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelect((e.target as HTMLInputElement).files);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('bg-gray-700');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
      }
    });

    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      resetState();
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', convert);
  }
});
