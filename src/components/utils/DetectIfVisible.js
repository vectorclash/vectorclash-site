export default class DetectIfVisible {
  constructor(element, callBack) {
    this.element = element;
    this.callBack = callBack;

    this.functionRef = this.checkIfVisible.bind(this);
    window.addEventListener("scroll", this.functionRef);
  }

  checkIfVisible(event) {
    let rect = this.element.getBoundingClientRect();

    if (rect.y < window.innerHeight - 100) {
      window.removeEventListener("scroll", this.functionRef);

      this.callBack();
    }
  }
}
