/**
 * Lightweight UI helper functions with ZERO heavy dependencies.
 * These can be imported without pulling in pdfjs-dist, lucide, or sortablejs.
 *
 * For the full UI module (setupFileInput, renderPages, etc.), import from '../ui.js'.
 */

// Lazy DOM references — queried on first use to avoid issues with module load order
let _loaderModal: HTMLElement | null | undefined;
let _loaderText: HTMLElement | null | undefined;
let _alertModal: HTMLElement | null | undefined;
let _alertTitle: HTMLElement | null | undefined;
let _alertMessage: HTMLElement | null | undefined;
let _alertOkBtn: HTMLElement | null | undefined;

function getLoaderModal() {
  if (_loaderModal === undefined)
    _loaderModal = document.getElementById('loader-modal');
  return _loaderModal;
}
function getLoaderText() {
  if (_loaderText === undefined)
    _loaderText = document.getElementById('loader-text');
  return _loaderText;
}
function getAlertModal() {
  if (_alertModal === undefined)
    _alertModal = document.getElementById('alert-modal');
  return _alertModal;
}
function getAlertTitle() {
  if (_alertTitle === undefined)
    _alertTitle = document.getElementById('alert-title');
  return _alertTitle;
}
function getAlertMessage() {
  if (_alertMessage === undefined)
    _alertMessage = document.getElementById('alert-message');
  return _alertMessage;
}
function getAlertOkBtn() {
  if (_alertOkBtn === undefined)
    _alertOkBtn = document.getElementById('alert-ok');
  return _alertOkBtn;
}

export const showLoader = (text = 'Loading...', progress?: number) => {
  const loaderText = getLoaderText();
  const loaderModal = getLoaderModal();

  if (loaderText) loaderText.textContent = text;

  if (loaderModal) {
    let progressBar = loaderModal.querySelector(
      '.loader-progress-bar'
    ) as HTMLElement | null;
    let progressContainer = loaderModal.querySelector(
      '.loader-progress-container'
    ) as HTMLElement | null;

    if (progress !== undefined && progress >= 0) {
      if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.className = 'loader-progress-container w-64 mt-4';
        progressContainer.innerHTML = `
          <div class="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div class="loader-progress-bar bg-indigo-500 h-full transition-all duration-300" style="width: 0%"></div>
          </div>
          <p class="loader-progress-text text-xs text-gray-400 mt-1 text-center">0%</p>
        `;
        loaderModal
          .querySelector('.bg-gray-800')
          ?.appendChild(progressContainer);
        progressBar = progressContainer.querySelector(
          '.loader-progress-bar'
        ) as HTMLElement;
      }

      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      const progressText = progressContainer.querySelector(
        '.loader-progress-text'
      );
      if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
      }
      progressContainer.classList.remove('hidden');
    } else {
      if (progressContainer) {
        progressContainer.classList.add('hidden');
      }
    }

    loaderModal.classList.remove('hidden');
  }
};

export const hideLoader = () => {
  const loaderModal = getLoaderModal();
  if (loaderModal) loaderModal.classList.add('hidden');
};

export const showAlert = (
  title: string,
  message: string,
  _type: string = 'error',
  callback?: () => void
) => {
  const alertTitle = getAlertTitle();
  const alertMessage = getAlertMessage();
  const alertModal = getAlertModal();
  let alertOkBtn = getAlertOkBtn();

  if (alertTitle) alertTitle.textContent = title;
  if (alertMessage) alertMessage.textContent = message;
  if (alertModal) alertModal.classList.remove('hidden');

  if (alertOkBtn) {
    const newOkBtn = alertOkBtn.cloneNode(true) as HTMLElement;
    alertOkBtn.replaceWith(newOkBtn);
    _alertOkBtn = newOkBtn;

    newOkBtn.addEventListener('click', () => {
      hideAlert();
      if (callback) callback();
    });
  }
};

export const hideAlert = () => {
  const alertModal = getAlertModal();
  if (alertModal) alertModal.classList.add('hidden');
};
