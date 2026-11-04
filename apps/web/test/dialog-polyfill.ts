// jsdom doesn't implement <dialog> modality. A minimal stand-in so tests can
// exercise open/close; focus trapping itself is the browser's job.
export function installDialogPolyfill(): void {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
